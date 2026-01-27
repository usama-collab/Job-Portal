from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobBase(BaseModel):

    title: str
    description: str
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None
    company: Optional[str] = None
    is_active: Optional[bool] = True

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
     
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None
    company: Optional[str] = None
    is_active: Optional[bool] = None

class JobOut(JobBase):

    id: int
    owner_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class config:
        orm_mode: True