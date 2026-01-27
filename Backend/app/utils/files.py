import os 
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException


MEDIA_ROOT = Path("media")
AVATAR_DIR = MEDIA_ROOT / "avatars"
LOGO_DIR = MEDIA_ROOT / "logos"
RESUME_DIR = MEDIA_ROOT / "resumes"

# ensure directories exist
for d in (AVATAR_DIR, LOGO_DIR, RESUME_DIR):
    d.mkdir(parents=True, exist_ok=True)

ALLOWED_DOC_EXT = {".pdf", ".doc", ".docx", ".txt"}
ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8MB


async def _save_upload_file(file: UploadFile, dest_dir: Path, allowed_exts: set) -> tuple[str, str]:
    """
    Save UploadFile to local MEDIA_ROOT/resumes, return (saved_path, original_filename)
    saved_path is a relative path string (e.g., 'media/resumes/<uuid>.pdf')
    """

    if not file:
        return None, None
    
    # Checking .extention of the file
    filename = Path(file.filename)
    ext = filename.suffix.lower()

    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension {ext}")
    
    # Read file to check bytes
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large {len(content)} - Limit is {MAX_FILE_SIZE}")
    
    unique_name = f'{uuid.uuid4().hex}{ext}'
    save_path = dest_dir / unique_name

    with open(save_path, "wb") as f:
        f.write(content)

    return str(save_path), filename.name


async def save_resume_file(file: UploadFile) -> tuple[str, str]:
    return await _save_upload_file(file,RESUME_DIR,ALLOWED_DOC_EXT)


async def save_avatar_file(file: UploadFile) -> tuple[str, str]:
    return await _save_upload_file(file,AVATAR_DIR,ALLOWED_IMAGE_EXT)


async def save_logo_file(file: UploadFile) -> tuple[str, str]:
    return await _save_upload_file(file,LOGO_DIR,ALLOWED_IMAGE_EXT)

