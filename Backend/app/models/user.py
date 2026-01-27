from sqlalchemy import Column, Integer,String,Boolean,DateTime, Text,func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
import enum

from app.core.db import Base


class UserRole(enum.Enum):
    SEEKER = 'seeker'
    EMPLOYER = 'employer'
    ADMIN = 'admin'


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True )
    password_hash = Column(String, nullable=False)
    role = Column(String, default=UserRole.SEEKER.value, nullable=False)
    email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    location = Column(String, nullable=True)

    # ----------------- Profile fields (new) -----------------
    # Seeker fields
    name = Column(String(50), nullable=False)
    bio = Column(Text, nullable=True)
    # store skills as JSON array of strings
    skills = Column(JSON, nullable=True) 

    # experience: optional list of objects e.g. [{"company":"X","title":"Y","years":2}, ...]
    experience = Column(JSON, nullable=True)

    # profile picture
    avatar_path = Column(String(512), nullable=True)
    avatar_filename = Column(String(255), nullable=True)

    # employer/company fields (used when role == "employer")
    company_name = Column(String(255), nullable=True)
    company_website = Column(String(255), nullable=True)
    company_description = Column(Text, nullable=True)
    logo_path = Column(String(512), nullable=True)
    logo_filename = Column(String(255), nullable=True)
    
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    jobs = relationship('Job', back_populates='owner')
    applications = relationship('Application', back_populates='user', cascade="all, delete-orphan")