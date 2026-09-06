"""add user auth version

Revision ID: d3f4a8b91c20
Revises: 8c91a7f24b6d
Create Date: 2026-09-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3f4a8b91c20"
down_revision: Union[str, Sequence[str], None] = "8c91a7f24b6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("auth_version", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "auth_version")
