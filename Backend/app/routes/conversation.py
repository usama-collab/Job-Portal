from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.exceptions import RedisError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import get_db
from app.core import redis_client
from app.crud import conversation as crud
from app.models.user import User
from app.routes.notification import prevent_caching
from app.schemas.conversation import ConversationOut, ConversationPage, MessageOut, MessagePage, ReadConversation, SendMessage
from app.schemas.notification import UnreadCount
from app.utils.functions import get_current_user

router = APIRouter(tags=["Messages"], dependencies=[Depends(prevent_caching)])


def enforce_send_limit(user_id):
    try:
        count, ttl = redis_client.redis_client.eval(
            redis_client.RATE_LIMIT_SCRIPT, 1, f"messages:rate:{user_id}", settings.MESSAGE_RATE_WINDOW_SECONDS)
    except RedisError:
        raise HTTPException(503, "Messaging is temporarily unavailable") from None
    if int(count) > settings.MESSAGE_SEND_LIMIT:
        raise HTTPException(429, "Too many messages. Please wait before sending again.",
                            headers={"Retry-After": str(max(1, int(ttl)))})


@router.get("/conversations", response_model=ConversationPage)
def inbox(limit: int = Query(20, ge=1, le=50), cursor: int | None = Query(None, gt=0),
          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.list_conversations(user, db, limit, cursor)


@router.get("/conversations/unread-count", response_model=UnreadCount)
def unread(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"unread_count": crud.unread_count(user, db)}


@router.get("/applications/{application_id}/conversation", response_model=ConversationOut)
def conversation(application_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_conversation(application_id, user, db)


@router.get("/applications/{application_id}/messages", response_model=MessagePage)
def messages(application_id: int, limit: int = Query(50, ge=1, le=100),
             before_id: int | None = Query(None, gt=0), after_id: int | None = Query(None, gt=0),
             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.list_messages(application_id, user, db, limit, before_id, after_id)


@router.post("/applications/{application_id}/messages", response_model=MessageOut, status_code=201)
def send(application_id: int, payload: SendMessage, response: Response,
         user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    crud.authorize(application_id, user, db)
    enforce_send_limit(user.id)
    result, created = crud.send_message(application_id, payload, user, db)
    response.status_code = 201 if created else 200
    return result


@router.patch("/applications/{application_id}/conversation/read", response_model=ReadConversation)
def read(application_id: int, payload: ReadConversation,
         user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.mark_read(application_id, payload.last_read_message_id, user, db)
