from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


ShortText = Annotated[str, Field(min_length=1, max_length=200)]
Description = Annotated[str, Field(min_length=1, max_length=2000)]
DateText = Annotated[str, Field(pattern=r"^\d{4}(?:-(?:0[1-9]|1[0-2]))?$")]


class ResumeItem(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    source_excerpt: Optional[str] = Field(default=None, max_length=300)


class ExtractedSkill(ResumeItem):
    name: ShortText


class WorkExperience(ResumeItem):
    company: ShortText
    title: ShortText
    location: Optional[ShortText] = None
    start_date: Optional[DateText] = None
    end_date: Optional[DateText] = None
    is_current: bool = False
    description: Optional[Description] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        if self.is_current and self.end_date:
            raise ValueError("a current role cannot have an end_date")
        return self


class Education(ResumeItem):
    institution: ShortText
    degree: Optional[ShortText] = None
    field_of_study: Optional[ShortText] = None
    start_date: Optional[DateText] = None
    end_date: Optional[DateText] = None
    description: Optional[Description] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class Project(ResumeItem):
    name: ShortText
    role: Optional[ShortText] = None
    description: Optional[Description] = None
    technologies: list[ShortText] = Field(default_factory=list, max_length=30)
    url: Optional[HttpUrl] = None
    start_date: Optional[DateText] = None
    end_date: Optional[DateText] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class ResumeExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    skills: list[ExtractedSkill] = Field(default_factory=list, max_length=100)
    work_experience: list[WorkExperience] = Field(default_factory=list, max_length=30)
    education: list[Education] = Field(default_factory=list, max_length=20)
    projects: list[Project] = Field(default_factory=list, max_length=30)
    warnings: list[Annotated[str, Field(max_length=300)]] = Field(default_factory=list, max_length=20)


class ResumeMetadata(BaseModel):
    resume_id: str
    filename: str
    uploaded_at: datetime
    download_url: str


class ResumeImport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    application_id: int = Field(gt=0)


class AnalyzeResumeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resume_id: str = Field(min_length=36, max_length=36)
    consent: bool


class ResumeAnalysis(ResumeExtraction):
    analysis_id: str
    resume_id: str
    expires_at: datetime


class ApplyResumeAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    analysis_id: str = Field(min_length=36, max_length=36)
    resume_id: str = Field(min_length=36, max_length=36)
    skills: list[ShortText] = Field(default_factory=list, max_length=100)
    work_experience: list[WorkExperience] = Field(default_factory=list, max_length=30)
    education: list[Education] = Field(default_factory=list, max_length=20)
    projects: list[Project] = Field(default_factory=list, max_length=30)

    @field_validator("work_experience", "education", "projects")
    @classmethod
    def remove_evidence(cls, items):
        for item in items:
            item.source_excerpt = None
        return items
