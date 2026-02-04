from pydantic import BaseModel
from datetime import datetime
from app.schemas.job import JobOut

class SavedJobOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    created_at: datetime
    job: JobOut  # This nests the full job details

    class Config:
        orm_mode = True