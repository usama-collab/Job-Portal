from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud import notification as crud
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import MarkAllResult, NotificationList, NotificationOut, UnreadCount
from app.utils.functions import get_current_user


def prevent_caching(response: Response):
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(prevent_caching)])


def notification_response(row: Notification):
    result = NotificationOut.model_validate(row)
    if row.application_id is not None and row.job_id is not None:
        if row.type == "application_message_received":
            result.target_path = f"/messages/{row.application_id}" if row.message_id else None
        elif row.type == "application_received":
            result.target_path = f"/employer/jobs/{row.job_id}/applicants?applicationId={row.application_id}"
        else:
            result.target_path = f"/applications?applicationId={row.application_id}"
    return result


@router.get("", response_model=NotificationList)
def list_notifications(
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, max_length=256),
    unread_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows, next_cursor = crud.list_notifications(user, db, limit, cursor, unread_only)
    return NotificationList(items=[notification_response(row) for row in rows], next_cursor=next_cursor)


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"unread_count": crud.visible_notifications(user, db).filter(Notification.read_at.is_(None)).count()}


# Keep this static route ahead of the dynamic ID route.
@router.patch("/read-all", response_model=MarkAllResult)
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"updated_count": crud.mark_read(user, db)}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    crud.mark_read(user, db, notification_id)
    return notification_response(crud.visible_notifications(user, db).filter(Notification.id == notification_id).one())
