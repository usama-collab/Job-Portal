from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator


class CompanyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    website: Optional[HttpUrl] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Company name is required")
        return value


class CompanyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    website: Optional[HttpUrl] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Company name cannot be empty")
        return value


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    membership_role: Optional[str] = None
    created_at: datetime
