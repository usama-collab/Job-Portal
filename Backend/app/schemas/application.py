# schemas/application.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    # resume will be uploaded via UploadFile in endpoint, so not in the body

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    user_id: int
    resume_path: Optional[str] = None
    resume_filename: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class ApplicationUpdateStatus(BaseModel):
    status: str  # validate in endpoint (allowed statuses)
