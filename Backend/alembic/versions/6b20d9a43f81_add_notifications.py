"""Add persistent in-app notifications.

Revision ID: 6b20d9a43f81
Revises: d3f4a8b91c20
"""
from alembic import op
import sqlalchemy as sa

revision = "6b20d9a43f81"
down_revision = "d3f4a8b91c20"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="SET NULL")),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="SET NULL")),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("type IN ('application_received', 'application_status_changed')", name="ck_notification_type"),
    )
    op.create_index("ix_notifications_recipient_history", "notifications", ["recipient_id", "created_at", "id"])
    op.create_index("ix_notifications_recipient_unread", "notifications", ["recipient_id"], postgresql_where=sa.text("read_at IS NULL"), sqlite_where=sa.text("read_at IS NULL"))


def downgrade():
    op.drop_table("notifications")
