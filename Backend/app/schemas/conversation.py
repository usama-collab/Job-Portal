from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SendMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: str = Field(max_length=5000)
    client_message_id: UUID

    @field_validator("body")
    @classmethod
    def clean_body(cls, value):
        value = value.strip()
        if not value or "\x00" in value:
            raise ValueError("Message must contain text without null characters")
        return value


class ReadConversation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    last_read_message_id: int = Field(gt=0)


class MessageOut(BaseModel):
    id: int
    sender_id: int | None
    sender_name: str
    body: str
    created_at: datetime


class MessagePage(BaseModel):
    items: list[MessageOut]
    next_before_id: int | None = None
    next_after_id: int | None = None


class ConversationOut(BaseModel):
    application_id: int
    conversation_id: int | None
    job_id: int
    job_title: str
    company_name: str
    applicant_name: str
    status: str
    latest_message: MessageOut | None
    unread_count: int


class ConversationPage(BaseModel):
    items: list[ConversationOut]
    next_cursor: int | None
