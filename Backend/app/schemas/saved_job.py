from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.job import JobOut

class SavedJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    job_id: int
    created_at: datetime
    job: JobOut  # This nests the full job details
