from sqlalchemy import Column, Integer,String,Boolean,DateTime, Text,func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON

from app.core.db import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True )
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, server_default="false", nullable=False)
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

    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company_memberships = relationship('CompanyMembership', back_populates='user', cascade="all, delete-orphan")
    created_jobs = relationship('Job', back_populates='created_by')
    applications = relationship('Application', back_populates='user', cascade="all, delete-orphan")
