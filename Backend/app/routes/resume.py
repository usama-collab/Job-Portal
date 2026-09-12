from __future__ import annotations

import asyncio
import json
import mimetypes
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import redis
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.config import settings
from app.core.redis_client import redis_client
from app.models.application import Application
from app.models.user import User
from app.schemas.resume import (
    AnalyzeResumeRequest,
    ApplyResumeAnalysis,
    ResumeAnalysis,
    ResumeImport,
    ResumeMetadata,
)
from app.schemas.user import UserOut
from app.utils.files import (
    MAX_FILE_SIZE,
    StorageError,
    StorageNotConfigured,
    StorageObjectNotFound,
    build_object_key,
    delete_object,
    download_object,
    is_storage_key,
    save_profile_resume_file,
    upload_object,
)
from app.utils.functions import get_current_user
from app.utils.resume_ai import extract_structured_resume
from app.utils.resume_parser import ResumeParseError, extract_resume_text


router = APIRouter(prefix="/users/me/resume", tags=["Resume"])
ANALYSIS_TTL_SECONDS = 24 * 60 * 60


def _analysis_key(user_id: int) -> str:
    return f"resume-analysis:{user_id}"


def _metadata(user: User) -> ResumeMetadata:
    if not user.resume_id or not user.resume_filename or not user.resume_uploaded_at:
        raise HTTPException(status_code=404, detail="No profile resume uploaded")
    return ResumeMetadata(
        resume_id=user.resume_id,
        filename=user.resume_filename,
        uploaded_at=user.resume_uploaded_at,
        download_url="/users/me/resume/download",
    )


async def _replace_resume(user: User, object_key: str, filename: str, db: Session) -> ResumeMetadata:
    old_path = user.resume_path
    user.resume_path = object_key
    user.resume_filename = filename
    user.resume_id = str(uuid.uuid4())
    user.resume_uploaded_at = datetime.now(timezone.utc)
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        try:
            await delete_object(object_key)
        except StorageError:
            pass
        raise

    try:
        redis_client.delete(_analysis_key(user.id))
    except redis.RedisError:
        pass
    if is_storage_key(old_path, "profile-resumes") and old_path != object_key:
        try:
            await delete_object(old_path)
        except StorageError:
            pass
    return _metadata(user)


@router.get("", response_model=ResumeMetadata)
def get_resume(response: Response, current_user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return _metadata(current_user)


@router.post("", response_model=ResumeMetadata)
async def upload_resume(
    resume: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved_path, filename = await save_profile_resume_file(resume)
    assert saved_path and filename
    return await _replace_resume(current_user, saved_path, filename, db)


@router.post("/import", response_model=ResumeMetadata)
async def import_resume(
    payload: ResumeImport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter(
        Application.id == payload.application_id,
        Application.user_id == current_user.id,
    ).first()
    if not application or not is_storage_key(application.resume_path, "resumes"):
        raise HTTPException(status_code=404, detail="Application resume not found")
    filename = application.resume_filename or "resume"
    extension = Path(filename).suffix.lower()
    if extension not in {".pdf", ".docx"}:
        raise HTTPException(status_code=400, detail="Convert this resume to PDF or DOCX before importing it")
    try:
        content, content_type = await download_object(application.resume_path)
    except StorageObjectNotFound as exc:
        raise HTTPException(status_code=404, detail="Application resume not found") from exc
    except StorageNotConfigured as exc:
        raise HTTPException(status_code=503, detail="File storage is not configured") from exc
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="File storage is unavailable") from exc
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Resume is too large")
    object_key = build_object_key("profile-resumes", extension)
    await upload_object(object_key, content, content_type)
    return await _replace_resume(current_user, object_key, filename, db)


@router.get("/download")
async def download_resume(current_user: User = Depends(get_current_user)):
    if not is_storage_key(current_user.resume_path, "profile-resumes"):
        raise HTTPException(status_code=404, detail="No profile resume uploaded")
    try:
        content, stored_type = await download_object(current_user.resume_path)
    except StorageObjectNotFound as exc:
        raise HTTPException(status_code=404, detail="Profile resume not found") from exc
    except StorageNotConfigured as exc:
        raise HTTPException(status_code=503, detail="File storage is not configured") from exc
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="File storage is unavailable") from exc
    filename = Path((current_user.resume_filename or "resume").replace("\\", "/")).name.replace('"', "")
    return Response(
        content=content,
        media_type=stored_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )


@router.delete("", status_code=204)
async def remove_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    old_path = current_user.resume_path
    current_user.resume_path = None
    current_user.resume_filename = None
    current_user.resume_id = None
    current_user.resume_uploaded_at = None
    db.commit()
    try:
        redis_client.delete(_analysis_key(current_user.id))
    except redis.RedisError:
        pass
    if is_storage_key(old_path, "profile-resumes"):
        try:
            await delete_object(old_path)
        except StorageError:
            pass
    return Response(status_code=204)


def _enforce_daily_limit(user_id: int) -> None:
    now = datetime.now(timezone.utc)
    key = f"resume-analysis-rate:{user_id}:{now.date().isoformat()}"
    try:
        with redis_client.pipeline() as pipe:
            pipe.incr(key)
            pipe.expire(key, 48 * 60 * 60)
            count, _ = pipe.execute()
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Resume analysis is temporarily unavailable") from exc
    if count > 5:
        raise HTTPException(status_code=429, detail="Daily resume analysis limit reached")


@router.post("/analyze", response_model=ResumeAnalysis)
async def analyze_resume(
    payload: AnalyzeResumeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.consent:
        raise HTTPException(status_code=422, detail="Consent is required before analysis")
    if not settings.RESUME_AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI resume analysis is not enabled")
    if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
        raise HTTPException(status_code=503, detail="AI resume analysis is not configured")
    if payload.resume_id != current_user.resume_id or not is_storage_key(current_user.resume_path, "profile-resumes"):
        raise HTTPException(status_code=409, detail="The profile resume has changed")
    _enforce_daily_limit(current_user.id)
    try:
        content, _ = await download_object(current_user.resume_path)
    except StorageObjectNotFound as exc:
        raise HTTPException(status_code=404, detail="Profile resume not found") from exc
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="File storage is unavailable") from exc
    try:
        text = await asyncio.to_thread(extract_resume_text, content, current_user.resume_filename or "")
    except ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    extraction = await extract_structured_resume(text)
    latest_user = db.query(User).filter(User.id == current_user.id).populate_existing().first()
    if not latest_user or latest_user.resume_id != payload.resume_id:
        raise HTTPException(status_code=409, detail="The profile resume changed during analysis")
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ANALYSIS_TTL_SECONDS)
    result = ResumeAnalysis(
        **extraction.model_dump(),
        analysis_id=str(uuid.uuid4()),
        resume_id=latest_user.resume_id,
        expires_at=expires_at,
    )
    try:
        redis_client.setex(_analysis_key(current_user.id), ANALYSIS_TTL_SECONDS, result.model_dump_json())
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Could not save the analysis for review") from exc
    return Response(
        content=result.model_dump_json(), media_type="application/json", headers={"Cache-Control": "no-store"}
    )


@router.get("/analysis", response_model=ResumeAnalysis)
def get_analysis(response: Response, current_user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    try:
        raw = redis_client.get(_analysis_key(current_user.id))
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Resume analysis is temporarily unavailable") from exc
    if not raw:
        raise HTTPException(status_code=404, detail="No current resume analysis")
    result = ResumeAnalysis.model_validate_json(raw)
    if result.resume_id != current_user.resume_id:
        redis_client.delete(_analysis_key(current_user.id))
        raise HTTPException(status_code=404, detail="No current resume analysis")
    return result


def _dedupe_strings(existing: list, incoming: list[str]) -> list[str]:
    result = [value for value in existing if isinstance(value, str)]
    seen = {value.strip().casefold() for value in result}
    for value in incoming:
        cleaned = value.strip()
        if cleaned.casefold() not in seen:
            result.append(cleaned)
            seen.add(cleaned.casefold())
    return result


def _dedupe_objects(existing: list, incoming: list[dict]) -> list:
    result = list(existing)
    seen = {json.dumps(item, sort_keys=True, default=str) for item in result}
    for item in incoming:
        key = json.dumps(item, sort_keys=True, default=str)
        if key not in seen:
            result.append(item)
            seen.add(key)
    return result


@router.post("/analysis/apply", response_model=UserOut)
def apply_analysis(
    payload: ApplyResumeAnalysis,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        raw = redis_client.get(_analysis_key(current_user.id))
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Resume analysis is temporarily unavailable") from exc
    if not raw:
        raise HTTPException(status_code=404, detail="Resume analysis expired")
    draft = ResumeAnalysis.model_validate_json(raw)
    if draft.analysis_id != payload.analysis_id or draft.resume_id != payload.resume_id:
        raise HTTPException(status_code=409, detail="Resume analysis does not match the current draft")

    user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
    if not user or user.resume_id != payload.resume_id:
        raise HTTPException(status_code=409, detail="The profile resume has changed")
    user.skills = _dedupe_strings(user.skills or [], payload.skills)
    for field in ("work_experience", "education", "projects"):
        incoming = [item.model_dump(mode="json", exclude={"source_excerpt"}) for item in getattr(payload, field)]
        setattr(user, field, _dedupe_objects(getattr(user, field) or [], incoming))
    db.commit()
    db.refresh(user)
    try:
        redis_client.delete(_analysis_key(current_user.id))
    except redis.RedisError:
        pass
    return user
