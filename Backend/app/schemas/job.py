from pydantic import BaseModel, ConfigDict, field_validator
from app.utils.job_description import sanitize_description
from typing import Optional
from datetime import datetime


class JobBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None
    is_active: Optional[bool] = True

class JobCreate(JobBase):
    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return sanitize_description(value)

class JobUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
     
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: Optional[str]) -> Optional[str]:
        return sanitize_description(value) if value is not None else None

class JobOut(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    company: str
    created_by_user_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class EmployerJobOut(JobOut):
    applications_count: int = 0
