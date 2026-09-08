"""Notification writes participate in the caller's application transaction."""
import base64
import binascii
import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.company import CompanyMembership
from app.models.notification import Notification
from app.models.user import User


def application_recipients(company_id: int, applicant_id: int, db: Session):
    # Extend this policy to ("owner", "manager") when manager delivery is enabled.
    return db.query(User).join(CompanyMembership).filter(
        CompanyMembership.company_id == company_id,
        CompanyMembership.role.in_(("owner",)),
        User.id != applicant_id,
        User.is_active.is_(True),
        User.email_verified.is_(True),
    ).all()


def notify_application_received(application: Application, db: Session):
    job = application.job
    applicant = application.user
    for recipient in application_recipients(job.company_id, application.user_id, db):
        db.add(Notification(
            recipient_id=recipient.id,
            type="application_received",
            application_id=application.id,
            job_id=job.id,
            company_id=job.company_id,
            title="New application",
            message=f"{applicant.name} applied for {job.title} at {job.company}.",
        ))


def notify_status_changed(application: Application, previous_status: str, db: Session):
    job = application.job
    label = lambda value: value.replace("_", " ").capitalize()
    db.add(Notification(
        recipient_id=application.user_id,
        type="application_status_changed",
        application_id=application.id,
        job_id=job.id,
        company_id=job.company_id,
        title="Application status updated",
        message=f"Your application for {job.title} at {job.company} changed from {label(previous_status)} to {label(application.status)}.",
    ))


def visible_notifications(user: User, db: Session):
    membership = db.query(CompanyMembership.company_id).filter(
        CompanyMembership.company_id == Notification.company_id,
        CompanyMembership.user_id == user.id,
        CompanyMembership.role.in_(("owner", "manager")),
    ).exists()
    company_access = Notification.company_id.is_not(None) if user.is_admin else membership
    applicant_access = db.query(Application.id).filter(
        Application.id == Notification.application_id, Application.user_id == user.id,
    ).exists()
    message_access = and_(Notification.application_id.is_not(None), Notification.message_id.is_not(None),
                          or_(applicant_access, membership))
    return db.query(Notification).filter(
        Notification.recipient_id == user.id,
        or_(Notification.type == "application_status_changed",
            and_(Notification.type == "application_received", company_access),
            and_(Notification.type == "application_message_received", message_access)),
    )


def encode_cursor(notification: Notification) -> str:
    value = json.dumps([notification.created_at.isoformat(), notification.id]).encode()
    return base64.urlsafe_b64encode(value).decode()


def decode_cursor(cursor: str):
    try:
        created_at, notification_id = json.loads(base64.b64decode(cursor, altchars=b"-_", validate=True))
        timestamp = datetime.fromisoformat(created_at)
        if type(notification_id) is not int or notification_id < 1:
            raise ValueError()
        return timestamp, notification_id
    except (ValueError, TypeError, binascii.Error, UnicodeDecodeError):
        raise HTTPException(status_code=422, detail="Invalid notification cursor") from None


def list_notifications(user: User, db: Session, limit: int, cursor: str | None, unread_only: bool):
    query = visible_notifications(user, db)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    if cursor:
        timestamp, notification_id = decode_cursor(cursor)
        query = query.filter(or_(
            Notification.created_at < timestamp,
            and_(Notification.created_at == timestamp, Notification.id < notification_id),
        ))
    rows = query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit + 1).all()
    return rows[:limit], encode_cursor(rows[limit - 1]) if len(rows) > limit else None


def mark_read(user: User, db: Session, notification_id: int | None = None):
    query = visible_notifications(user, db)
    if notification_id is not None:
        query = query.filter(Notification.id == notification_id)
        if query.first() is None:
            raise HTTPException(status_code=404, detail="Notification not found")
    try:
        count = query.filter(Notification.read_at.is_(None)).update(
            {Notification.read_at: datetime.now(timezone.utc)}, synchronize_session=False,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.expire_all()
    return count
