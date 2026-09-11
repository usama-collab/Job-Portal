# models/application.py
from sqlalchemy import Column, Integer, ForeignKey, String, Text, DateTime, Numeric, func
from sqlalchemy.orm import relationship
from app.core.db import Base  # adjust import if Base lives elsewhere
from app.models.conversation import Conversation, Message, ConversationRead  # register dependent metadata

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    resume_path = Column(String(512), nullable=True)   # local path to resume file
    resume_filename = Column(String(255), nullable=True)
    cover_letter = Column(Text, nullable=True)

    # Candidate details are stored on the application as a point-in-time snapshot.
    full_name = Column(String(100), nullable=True)
    email = Column(String(320), nullable=True)
    phone = Column(String(30), nullable=True)
    city = Column(String(100), nullable=True)
    current_job_title = Column(String(120), nullable=True)
    total_experience_years = Column(Numeric(4, 1), nullable=True)
    current_salary = Column(Numeric(14, 2), nullable=True)
    expected_salary = Column(Numeric(14, 2), nullable=True)
    salary_currency = Column(String(3), nullable=True)
    notice_period = Column(String(30), nullable=True)
    github_url = Column(String(2048), nullable=True)
    website_url = Column(String(2048), nullable=True)
    university_name = Column(String(160), nullable=True)
    degree = Column(String(120), nullable=True)
    field_of_study = Column(String(120), nullable=True)
    graduation_year = Column(Integer, nullable=True)

    status = Column(String(50), default="applied", nullable=False)  # applied, under_review, shortlisted, rejected, hired
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")
