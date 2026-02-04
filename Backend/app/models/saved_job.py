from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.db import Base

class SavedJob(Base):
    __tablename__ = 'saved_jobs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    job = relationship("Job")

    # Prevent duplicate saves
    __table_args__ = (UniqueConstraint('user_id', 'job_id', name='_user_job_uc'),)