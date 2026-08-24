from __future__ import annotations

import hashlib
import hmac
import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import quote, urlsplit

import httpx
from fastapi import HTTPException, UploadFile

from app.core.config import settings


ALLOWED_DOC_EXT = {".pdf", ".doc", ".docx", ".txt"}
ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8MB

R2_REGION = "auto"
R2_SERVICE = "s3"


class StorageError(Exception):
    """Base exception for an R2 operation failure."""


class StorageNotConfigured(StorageError):
    """Raised when the required R2 configuration is missing."""


class StorageObjectNotFound(StorageError):
    """Raised when an R2 object does not exist."""


def build_object_key(prefix: str, extension: str) -> str:
    """Create a database-safe object key without exposing a local path."""

    return f"{prefix}/{uuid.uuid4().hex}{extension}"


def is_storage_key(value: Optional[str], prefix: str) -> bool:
    """Return whether a stored value is a current R2 key for the prefix."""

    return bool(value and value.startswith(f"{prefix}/") and value.count("/") == 1)


def _configuration() -> tuple[str, str, str, str]:
    values = (
        settings.R2_ENDPOINT_URL,
        settings.R2_ACCESS_KEY_ID,
        settings.R2_SECRET_ACCESS_KEY,
        settings.R2_BUCKET_NAME,
    )
    if not all(values):
        raise StorageNotConfigured
    return values  # type: ignore[return-value]


def _object_url(object_key: str) -> tuple[str, str]:
    endpoint, _, _, bucket = _configuration()
    base_url = endpoint.rstrip("/")
    bucket_path = quote(bucket, safe="")
    key_path = quote(object_key, safe="/-_.~")
    url = f"{base_url}/{bucket_path}/{key_path}"
    parsed = urlsplit(url)
    return url, parsed.netloc


def _signing_key(secret_key: str, date: str) -> bytes:
    def sign(key: bytes, message: str) -> bytes:
        return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()

    return sign(
        sign(sign(sign(("AWS4" + secret_key).encode("utf-8"), date), R2_REGION), R2_SERVICE),
        "aws4_request",
    )


def _signed_headers(
    method: str,
    object_key: str,
    body: bytes,
    content_type: Optional[str] = None,
) -> tuple[str, dict[str, str]]:
    _, access_key, secret_key, _ = _configuration()
    url, host = _object_url(object_key)
    parsed = urlsplit(url)
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    short_date = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(body).hexdigest()

    headers = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    if content_type:
        headers["content-type"] = content_type

    canonical_headers = "".join(
        f"{name}:{' '.join(value.strip().split())}\n"
        for name, value in sorted(headers.items())
    )
    signed_header_names = ";".join(sorted(headers))
    canonical_uri = parsed.path or "/"
    canonical_request = "\n".join(
        (
            method,
            canonical_uri,
            "",
            canonical_headers,
            signed_header_names,
            payload_hash,
        )
    )
    credential_scope = f"{short_date}/{R2_REGION}/{R2_SERVICE}/aws4_request"
    string_to_sign = "\n".join(
        (
            "AWS4-HMAC-SHA256",
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        )
    )
    signature = hmac.new(
        _signing_key(secret_key, short_date),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    authorization = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_header_names}, Signature={signature}"
    )

    request_headers = {name: value for name, value in headers.items()}
    request_headers["Authorization"] = authorization
    return url, request_headers


async def _request(
    method: str,
    object_key: str,
    body: bytes = b"",
    content_type: Optional[str] = None,
) -> httpx.Response:
    url, headers = _signed_headers(method, object_key, body, content_type)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, url, content=body, headers=headers)
    except httpx.HTTPError as exc:
        raise StorageError from exc

    if response.status_code == 404:
        raise StorageObjectNotFound
    if response.status_code >= 400:
        raise StorageError
    return response


def _storage_http_error(exc: StorageError, not_found_detail: str = "File not found") -> HTTPException:
    if isinstance(exc, StorageNotConfigured):
        return HTTPException(status_code=503, detail="File storage is not configured")
    if isinstance(exc, StorageObjectNotFound):
        return HTTPException(status_code=404, detail=not_found_detail)
    return HTTPException(status_code=502, detail="File storage is unavailable")


async def upload_object(object_key: str, content: bytes, content_type: Optional[str] = None) -> None:
    try:
        await _request("PUT", object_key, content, content_type)
    except StorageError as exc:
        raise _storage_http_error(exc, "File upload failed") from exc


async def download_object(object_key: str) -> tuple[bytes, Optional[str]]:
    try:
        response = await _request("GET", object_key)
    except StorageError:
        raise
    return response.content, response.headers.get("content-type")


async def delete_object(object_key: str) -> None:
    try:
        await _request("DELETE", object_key)
    except StorageObjectNotFound:
        return


def _original_filename(file: UploadFile) -> str:
    raw_filename = (file.filename or "").replace("\\", "/")
    return Path(raw_filename).name


async def _save_upload_file(
    file: UploadFile,
    prefix: str,
    allowed_exts: set[str],
) -> tuple[Optional[str], Optional[str]]:
    """Validate and upload a file, returning (R2 object key, original filename)."""

    if not file:
        return None, None

    filename = _original_filename(file)
    extension = Path(filename).suffix.lower()
    if extension not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension {extension}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large {len(content)} - Limit is {MAX_FILE_SIZE}",
        )

    object_key = build_object_key(prefix, extension)
    content_type = file.content_type or mimetypes.guess_type(filename)[0]
    await upload_object(object_key, content, content_type)
    return object_key, filename


async def save_resume_file(file: UploadFile) -> tuple[Optional[str], Optional[str]]:
    return await _save_upload_file(file, "resumes", ALLOWED_DOC_EXT)


async def save_avatar_file(file: UploadFile) -> tuple[Optional[str], Optional[str]]:
    return await _save_upload_file(file, "avatars", ALLOWED_IMAGE_EXT)


async def save_logo_file(file: UploadFile) -> tuple[Optional[str], Optional[str]]:
    return await _save_upload_file(file, "logos", ALLOWED_IMAGE_EXT)
