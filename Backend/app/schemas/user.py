from pydantic import BaseModel, ConfigDict
from pydantic import EmailStr
from datetime import datetime
from typing import Any, List, Optional


class UserBase(BaseModel):

    name: str
    email: EmailStr
    
class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid")
    password: str

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    password: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str
    new_password: str
    
# Update schema for seeker profile
class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Any]] = None  # small dicts list

class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_admin: bool
    email_verified: bool
    created_at: Optional[datetime] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Any]] = None
    avatar_url: Optional[str] = None  # full URL/path served by static route
    company_membership: Optional[dict[str, Any]] = None
