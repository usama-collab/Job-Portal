from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.db import Base


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_message_id = Column(Integer, nullable=True, index=True)
    application = relationship("Application")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    body = Column(Text, nullable=False)
    client_message_id = Column(String(36), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sender = relationship("User")
    __table_args__ = (
        UniqueConstraint("conversation_id", "sender_id", "client_message_id", name="uq_message_retry"),
        Index("ix_messages_conversation_history", "conversation_id", "id"),
    )


class ConversationRead(Base):
    __tablename__ = "conversation_reads"
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    last_read_message_id = Column(Integer, nullable=False, default=0)
