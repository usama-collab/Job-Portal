"""Application-scoped messaging. Application locks serialize sends and read advances."""
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import joinedload
from app.models.application import Application
from app.models.company import CompanyMembership
from app.models.conversation import Conversation, ConversationRead, Message
from app.models.job import Job
from app.models.notification import Notification
from app.models.user import User


def participant_condition(user_id):
    membership = select(CompanyMembership.user_id).where(
        CompanyMembership.company_id == Job.company_id,
        CompanyMembership.user_id == user_id,
        CompanyMembership.role.in_(("owner", "manager")),
    ).correlate(Job).exists()
    return or_(Application.user_id == user_id, membership)


def application_query(user, db):
    return db.query(Application).join(Job).filter(participant_condition(user.id))


def authorize(application_id, user, db, lock=False):
    query = application_query(user, db).filter(Application.id == application_id)
    if lock:
        query = query.populate_existing().with_for_update(of=Application)
    application = query.first()
    if application is None:
        raise HTTPException(404, "Conversation not found")
    return application


def message_out(message, db):
    sender = message.sender
    return dict(id=message.id, sender_id=message.sender_id,
                sender_name=sender.name if sender else "Deleted user",
                body=message.body, created_at=message.created_at)


def unread_expression(user_id):
    read = select(ConversationRead.last_read_message_id).where(
        ConversationRead.conversation_id == Conversation.id,
        ConversationRead.user_id == user_id,
    ).correlate(Conversation).scalar_subquery()
    return and_(Message.id > func.coalesce(read, 0),
                or_(Message.sender_id.is_(None), Message.sender_id != user_id))


def unread_count(user, db, conversation_id=None):
    query = db.query(Message).join(Conversation).join(Application).join(Job).filter(
        participant_condition(user.id), unread_expression(user.id))
    if conversation_id is not None:
        query = query.filter(Conversation.id == conversation_id)
    return query.count()


def summary(application, conversation, user, db, latest=None, count=None):
    if latest is None and conversation and conversation.last_message_id:
        latest = db.get(Message, conversation.last_message_id)
    return dict(application_id=application.id, conversation_id=conversation.id if conversation else None,
                job_id=application.job_id, job_title=application.job.title,
                company_name=application.job.company, applicant_name=application.user.name,
                status=application.status, latest_message=message_out(latest, db) if latest else None,
                unread_count=count if count is not None else (unread_count(user, db, conversation.id) if conversation else 0))


def get_conversation(application_id, user, db):
    application = authorize(application_id, user, db)
    conversation = db.query(Conversation).filter_by(application_id=application_id).first()
    return summary(application, conversation, user, db)


def list_conversations(user, db, limit, cursor):
    query = db.query(Conversation).join(Application).join(Job).filter(participant_condition(user.id)).options(
        joinedload(Conversation.application).joinedload(Application.user),
        joinedload(Conversation.application).joinedload(Application.job).joinedload(Job.company_record))
    if cursor:
        query = query.filter(Conversation.last_message_id < cursor)
    rows = query.order_by(Conversation.last_message_id.desc()).limit(limit + 1).all()
    page = rows[:limit]
    latest = {m.id: m for m in db.query(Message).options(joinedload(Message.sender)).filter(
        Message.id.in_([c.last_message_id for c in page])).all()}
    counts = dict(db.query(Conversation.id, func.count(Message.id)).join(Message).filter(
        Conversation.id.in_([c.id for c in page]), unread_expression(user.id)).group_by(Conversation.id).all())
    return dict(items=[summary(c.application, c, user, db, latest.get(c.last_message_id), counts.get(c.id, 0)) for c in page],
                next_cursor=rows[limit - 1].last_message_id if len(rows) > limit else None)


def list_messages(application_id, user, db, limit, before_id, after_id):
    authorize(application_id, user, db)
    if before_id and after_id:
        raise HTTPException(422, "Use only one message cursor")
    conversation = db.query(Conversation).filter_by(application_id=application_id).first()
    query = db.query(Message).options(joinedload(Message.sender)).filter(Message.conversation_id == (conversation.id if conversation else -1))
    cursor = before_id or after_id
    if cursor and not query.filter(Message.id == cursor).first():
        raise HTTPException(422, "Invalid message cursor")
    if before_id:
        query = query.filter(Message.id < before_id)
    if after_id:
        query = query.filter(Message.id > after_id)
    rows = query.order_by(Message.id.asc() if after_id else Message.id.desc()).limit(limit + 1).all()
    page = rows[:limit]
    return dict(items=[message_out(m, db) for m in (page if after_id else reversed(page))],
                next_after_id=page[-1].id if after_id and len(rows) > limit else None,
                next_before_id=page[-1].id if not after_id and len(rows) > limit else None)


def send_message(application_id, payload, user, db):
    try:
        application = authorize(application_id, user, db, lock=True)
        conversation = db.query(Conversation).filter_by(application_id=application_id).first()
        if conversation is None:
            conversation = Conversation(application_id=application_id)
            db.add(conversation)
            db.flush()
        existing = db.query(Message).filter_by(conversation_id=conversation.id, sender_id=user.id,
                                              client_message_id=str(payload.client_message_id)).first()
        if existing:
            if existing.body != payload.body:
                raise HTTPException(409, "Message retry does not match original text")
            result = message_out(existing, db)
            db.commit()
            return result, False
        message = Message(conversation_id=conversation.id, sender_id=user.id,
                          body=payload.body, client_message_id=str(payload.client_message_id))
        db.add(message)
        db.flush()
        conversation.last_message_id = message.id
        members = select(CompanyMembership.user_id).where(
            CompanyMembership.company_id == application.job.company_id,
            CompanyMembership.role.in_(("owner", "manager")))
        recipients = db.query(User).filter(
            or_(User.id == application.user_id, User.id.in_(members)), User.id != user.id,
            User.is_active.is_(True), User.email_verified.is_(True)).all()
        for recipient in recipients:
            db.add(Notification(recipient_id=recipient.id, type="application_message_received",
                                application_id=application.id, job_id=application.job_id,
                                company_id=application.job.company_id, message_id=message.id,
                                title="New application message",
                                message=f"New message about {application.job.title} at {application.job.company}."))
        result = message_out(message, db)
        db.commit()
        return result, True
    except Exception:
        db.rollback()
        raise


def mark_read(application_id, message_id, user, db):
    try:
        authorize(application_id, user, db, lock=True)
        conversation = db.query(Conversation).filter_by(application_id=application_id).first()
        if not conversation or not db.query(Message).filter_by(id=message_id, conversation_id=conversation.id).first():
            raise HTTPException(422, "Invalid read position")
        read = db.get(ConversationRead, (conversation.id, user.id))
        if read is None:
            read = ConversationRead(conversation_id=conversation.id, user_id=user.id, last_read_message_id=0)
            db.add(read)
        read.last_read_message_id = max(read.last_read_message_id, message_id)
        db.query(Notification).filter(
            Notification.recipient_id == user.id, Notification.application_id == application_id,
            Notification.type == "application_message_received", Notification.message_id <= message_id,
            Notification.read_at.is_(None),
        ).update({Notification.read_at: datetime.now(timezone.utc)}, synchronize_session=False)
        result = read.last_read_message_id
        db.commit()
        return {"last_read_message_id": result}
    except Exception:
        db.rollback()
        raise
