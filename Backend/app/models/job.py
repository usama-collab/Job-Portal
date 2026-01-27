from sqlalchemy import Column, Integer, String, Boolean, func, DateTime, Text , ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base


class Job(Base):
    __tablename__ = 'jobs'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String(120), nullable=True, index=True)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    employment_type = Column(String(50), nullable=True)  # e.g. "full-time", "part-time", "remote"
    company = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)

    owner_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="jobs")
    applications = relationship('Application', back_populates='job', cascade="all, delete-orphan")



    def as_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "location": self.location,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "employment_type": self.employment_type,
            "company": self.company,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active,
            "owner_id": self.owner_id,
        }