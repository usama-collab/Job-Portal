"""Add candidate details to applications.

Revision ID: b7e4c2a91d30
Revises: 9f2c6d8e104a
"""
from alembic import op
import sqlalchemy as sa

revision = "b7e4c2a91d30"
down_revision = "9f2c6d8e104a"
branch_labels = None
depends_on = None


def upgrade():
    columns = (
        sa.Column("full_name", sa.String(100)),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(30)),
        sa.Column("city", sa.String(100)),
        sa.Column("current_job_title", sa.String(120)),
        sa.Column("total_experience_years", sa.Numeric(4, 1)),
        sa.Column("current_salary", sa.Numeric(14, 2)),
        sa.Column("expected_salary", sa.Numeric(14, 2)),
        sa.Column("salary_currency", sa.String(3)),
        sa.Column("notice_period", sa.String(30)),
        sa.Column("university_name", sa.String(160)),
        sa.Column("degree", sa.String(120)),
        sa.Column("field_of_study", sa.String(120)),
        sa.Column("graduation_year", sa.Integer()),
    )
    for column in columns:
        op.add_column("applications", column)


def downgrade():
    for name in (
        "graduation_year", "field_of_study", "degree", "university_name",
        "notice_period", "salary_currency", "expected_salary", "current_salary",
        "total_experience_years", "current_job_title", "city", "phone", "email",
        "full_name",
    ):
        op.drop_column("applications", name)
