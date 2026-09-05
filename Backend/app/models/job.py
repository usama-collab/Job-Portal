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
    is_active = Column(Boolean, default=True)

    company_id = Column(Integer, ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey('users.id', ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company_record = relationship("Company", back_populates="jobs")
    created_by = relationship("User", back_populates="created_jobs")
    applications = relationship('Application', back_populates='job', cascade="all, delete-orphan")

    @property
    def company(self):
        return self.company_record.name


    def as_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "location": self.location,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "employment_type": self.employment_type,
            "company": self.company_record.name,
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active,
            "created_by_user_id": self.created_by_user_id,
        }
