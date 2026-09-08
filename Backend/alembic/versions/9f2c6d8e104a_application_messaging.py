"""Application conversations and message notifications.

Revision ID: 9f2c6d8e104a
Revises: 6b20d9a43f81
"""
from alembic import op
import sqlalchemy as sa

revision = "9f2c6d8e104a"
down_revision = "6b20d9a43f81"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_message_id", sa.Integer()))
    op.create_index("ix_conversations_last_message_id", "conversations", ["last_message_id"])
    op.create_table("messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("client_message_id", sa.String(36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("conversation_id", "sender_id", "client_message_id", name="uq_message_retry"))
    op.create_index("ix_messages_conversation_history", "messages", ["conversation_id", "id"])
    op.create_table("conversation_reads",
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("last_read_message_id", sa.Integer(), nullable=False))
    with op.batch_alter_table("notifications") as batch:
        batch.add_column(sa.Column("message_id", sa.Integer()))
        batch.create_foreign_key("fk_notifications_message", "messages", ["message_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_notifications_message_id", ["message_id"])
        batch.drop_constraint("ck_notification_type", type_="check")
        batch.create_check_constraint("ck_notification_type", "type IN ('application_received', 'application_status_changed', 'application_message_received')")


def downgrade():
    op.execute("DELETE FROM notifications WHERE type = 'application_message_received'")
    with op.batch_alter_table("notifications") as batch:
        batch.drop_constraint("ck_notification_type", type_="check")
        batch.create_check_constraint("ck_notification_type", "type IN ('application_received', 'application_status_changed')")
        batch.drop_index("ix_notifications_message_id")
        batch.drop_constraint("fk_notifications_message", type_="foreignkey")
        batch.drop_column("message_id")
    op.drop_table("conversation_reads")
    op.drop_table("messages")
    op.drop_table("conversations")
