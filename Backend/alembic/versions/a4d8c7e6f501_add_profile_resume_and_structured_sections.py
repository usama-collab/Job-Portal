"""add profile resume and structured profile sections

Revision ID: a4d8c7e6f501
Revises: c8a1f2d3e4b5
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a4d8c7e6f501"
down_revision = "c8a1f2d3e4b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("work_experience", postgresql.JSON(), nullable=True))
    op.add_column("users", sa.Column("education", postgresql.JSON(), nullable=True))
    op.add_column("users", sa.Column("projects", postgresql.JSON(), nullable=True))
    op.add_column("users", sa.Column("resume_path", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("resume_filename", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("resume_id", sa.String(length=36), nullable=True))
    op.add_column("users", sa.Column("resume_uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_users_resume_id", "users", ["resume_id"])


def downgrade() -> None:
    op.drop_constraint("uq_users_resume_id", "users", type_="unique")
    for column in ("resume_uploaded_at", "resume_id", "resume_filename", "resume_path", "projects", "education", "work_experience"):
        op.drop_column("users", column)
