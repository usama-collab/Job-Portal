from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, Text, func, text

from app.core.db import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(40), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="SET NULL"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"))
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"))
    title = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("type IN ('application_received', 'application_status_changed')", name="ck_notification_type"),
        Index("ix_notifications_recipient_history", "recipient_id", "created_at", "id"),
        Index("ix_notifications_recipient_unread", "recipient_id", postgresql_where=text("read_at IS NULL"), sqlite_where=text("read_at IS NULL")),
    )
