from pydantic import BaseModel, HttpUrl
from pydantic import EmailStr
from typing import Any, List, Optional


class UserBase(BaseModel):

    name: str
    email: EmailStr
    role: str
    
class UserCreate(UserBase):
    role: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    
# Update schema for seeker profile
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Any]] = None  # small dicts list

# Update schema for employer/company
class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    company_website: Optional[HttpUrl] = None
    company_description: Optional[str] = None

class UserOut(UserBase):
    id: int
    email_verified: bool
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Any]] = None
    avatar_url: Optional[str] = None  # full URL/path served by static route
    # employer fields
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    company_description: Optional[str] = None
    logo_url: Optional[str] = None
    

    class config:
        orm_mode = True    