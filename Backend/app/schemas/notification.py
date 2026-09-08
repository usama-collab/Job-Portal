from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: Literal["application_received", "application_status_changed", "application_message_received"]
    application_id: int | None
    job_id: int | None
    company_id: int | None
    title: str
    message: str
    created_at: datetime
    read_at: datetime | None
    target_path: str | None = None


class NotificationList(BaseModel):
    items: list[NotificationOut]
    next_cursor: str | None


class UnreadCount(BaseModel):
    unread_count: int


class MarkAllResult(BaseModel):
    updated_count: int
