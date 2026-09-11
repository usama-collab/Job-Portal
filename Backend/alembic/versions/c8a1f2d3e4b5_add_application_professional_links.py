"""Add professional links to applications.

Revision ID: c8a1f2d3e4b5
Revises: b7e4c2a91d30
"""
from alembic import op
import sqlalchemy as sa


revision = "c8a1f2d3e4b5"
down_revision = "b7e4c2a91d30"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("applications", sa.Column("github_url", sa.String(2048), nullable=True))
    op.add_column("applications", sa.Column("website_url", sa.String(2048), nullable=True))


def downgrade():
    op.drop_column("applications", "website_url")
    op.drop_column("applications", "github_url")
