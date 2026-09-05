# schemas/application.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Literal, Optional

class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    # resume will be uploaded via UploadFile in endpoint, so not in the body

class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    user_id: int
    resume_path: Optional[str] = None
    resume_filename: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    created_at: datetime
    user_email: Optional[str] = None

class ApplicationUpdateStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["applied", "under_review", "shortlisted", "hired", "rejected"]
