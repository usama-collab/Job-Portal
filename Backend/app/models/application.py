# models/application.py
from sqlalchemy import Column, Integer, ForeignKey, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.core.db import Base  # adjust import if Base lives elsewhere

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    resume_path = Column(String(512), nullable=True)   # local path to resume file
    resume_filename = Column(String(255), nullable=True)
    cover_letter = Column(Text, nullable=True)

    status = Column(String(50), default="applied", nullable=False)  # applied, under_review, shortlisted, rejected, hired
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")
