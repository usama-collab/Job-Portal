# schemas/application.py
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, TypeAdapter, field_validator
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import re

NOTICE_PERIODS = Literal["immediate", "15_days", "30_days", "60_days", "90_days", "more_than_90_days"]
HTTP_URL = TypeAdapter(HttpUrl)

class ApplicationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    city: str = Field(min_length=2, max_length=100)
    current_job_title: Optional[str] = Field(default=None, max_length=120)
    total_experience_years: Optional[Decimal] = Field(default=None, ge=0, le=80, decimal_places=1)
    current_salary: Optional[Decimal] = Field(default=None, ge=0, le=999_999_999_999)
    expected_salary: Optional[Decimal] = Field(default=None, ge=0, le=999_999_999_999)
    salary_currency: str = Field(min_length=3, max_length=3)
    notice_period: NOTICE_PERIODS
    github_url: Optional[str] = Field(default=None, max_length=2048)
    website_url: Optional[str] = Field(default=None, max_length=2048)
    university_name: str = Field(min_length=2, max_length=160)
    degree: str = Field(min_length=2, max_length=120)
    field_of_study: Optional[str] = Field(default=None, max_length=120)
    graduation_year: int = Field(ge=1950, le=datetime.now().year + 8)
    cover_letter: str = Field(min_length=20, max_length=10_000)

    @field_validator(
        "full_name", "city", "current_job_title", "university_name", "degree",
        "field_of_study", "cover_letter", mode="before"
    )
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()
        digits = re.sub(r"\D", "", value)
        if len(digits) < 7 or len(digits) > 15 or not re.fullmatch(r"[+()\d.\-\s]+", value):
            raise ValueError("Enter a valid phone number with 7 to 15 digits")
        return value

    @field_validator("salary_currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        value = value.strip().upper()
        if not value.isalpha():
            raise ValueError("Currency must be a 3-letter ISO code")
        return value

    @field_validator("github_url", "website_url", mode="before")
    @classmethod
    def validate_optional_url(cls, value):
        if value is None or not isinstance(value, str):
            return value
        value = value.strip()
        if not value:
            return None
        return str(HTTP_URL.validate_python(value))

class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    job_title: Optional[str] = None
    user_id: int
    resume_path: Optional[str] = None
    resume_filename: Optional[str] = None
    cover_letter: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    current_job_title: Optional[str] = None
    total_experience_years: Optional[Decimal] = None
    current_salary: Optional[Decimal] = None
    expected_salary: Optional[Decimal] = None
    salary_currency: Optional[str] = None
    notice_period: Optional[str] = None
    github_url: Optional[str] = None
    website_url: Optional[str] = None
    university_name: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[int] = None
    status: str
    created_at: datetime
    user_email: Optional[str] = None

class ApplicationUpdateStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["applied", "under_review", "shortlisted", "hired", "rejected"]
