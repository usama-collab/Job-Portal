"""company based employer authorization

Revision ID: 8c91a7f24b6d
Revises: 5a32b9f3c1a4
Create Date: 2026-09-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c91a7f24b6d"
down_revision: Union[str, Sequence[str], None] = "5a32b9f3c1a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), server_default=sa.false(), nullable=True))
    op.execute("UPDATE users SET is_admin = (role = 'admin')")
    op.alter_column("users", "is_admin", nullable=False)

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_path", sa.String(length=512), nullable=True),
        sa.Column("logo_filename", sa.String(length=255), nullable=True),
        sa.Column("legacy_owner_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("legacy_owner_user_id", name="uq_companies_legacy_owner"),
    )
    op.create_index(op.f("ix_companies_id"), "companies", ["id"], unique=False)
    op.create_index(op.f("ix_companies_name"), "companies", ["name"], unique=False)

    op.create_table(
        "company_memberships",
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=30), server_default="owner", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('owner', 'manager')", name="ck_company_membership_role"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("company_id", "user_id"),
        sa.UniqueConstraint("user_id", name="uq_company_memberships_user_id"),
    )
    op.create_index(
        "uq_company_memberships_one_owner",
        "company_memberships",
        ["company_id"],
        unique=True,
        postgresql_where=sa.text("role = 'owner'"),
    )

    op.add_column("jobs", sa.Column("company_id", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_jobs_company_id", "jobs", "companies", ["company_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key(
        "fk_jobs_created_by_user_id",
        "jobs",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_jobs_company_id"), "jobs", ["company_id"], unique=False)
    op.create_index(op.f("ix_jobs_created_by_user_id"), "jobs", ["created_by_user_id"], unique=False)

    op.execute(
        """
        INSERT INTO companies (
            name, website, description, logo_path, logo_filename, legacy_owner_user_id
        )
        SELECT
            COALESCE(
                NULLIF(BTRIM(u.company_name), ''),
                (SELECT NULLIF(BTRIM(j.company), '') FROM jobs j
                 WHERE j.owner_id = u.id AND NULLIF(BTRIM(j.company), '') IS NOT NULL
                 ORDER BY j.id LIMIT 1),
                u.name || '''s Company'
            ),
            u.company_website,
            u.company_description,
            u.logo_path,
            u.logo_filename,
            u.id
        FROM users u
        WHERE u.role = 'employer'
           OR EXISTS (SELECT 1 FROM jobs j WHERE j.owner_id = u.id)
        """
    )
    op.execute(
        """
        INSERT INTO company_memberships (company_id, user_id, role)
        SELECT id, legacy_owner_user_id, 'owner'
        FROM companies
        WHERE legacy_owner_user_id IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE jobs j
        SET company_id = c.id, created_by_user_id = j.owner_id
        FROM companies c
        WHERE c.legacy_owner_user_id = j.owner_id
        """
    )
    op.alter_column("jobs", "company_id", nullable=False)

    op.drop_constraint("uq_companies_legacy_owner", "companies", type_="unique")
    op.drop_column("companies", "legacy_owner_user_id")

    op.drop_constraint("jobs_owner_id_fkey", "jobs", type_="foreignkey")
    op.drop_index(op.f("ix_jobs_owner_id"), table_name="jobs")
    op.drop_column("jobs", "owner_id")
    op.drop_column("jobs", "company")

    for column_name in (
        "role",
        "company_name",
        "company_website",
        "company_description",
        "logo_path",
        "logo_filename",
    ):
        op.drop_column("users", column_name)


def downgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(), server_default="seeker", nullable=False))
    op.add_column("users", sa.Column("company_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("company_website", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("company_description", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("logo_path", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("logo_filename", sa.String(length=255), nullable=True))
    op.execute(
        """
        UPDATE users u
        SET role = CASE WHEN u.is_admin THEN 'admin'
                        WHEN cm.user_id IS NOT NULL THEN 'employer'
                        ELSE 'seeker' END,
            company_name = c.name,
            company_website = c.website,
            company_description = c.description,
            logo_path = c.logo_path,
            logo_filename = c.logo_filename
        FROM company_memberships cm
        JOIN companies c ON c.id = cm.company_id
        WHERE cm.user_id = u.id AND cm.role = 'owner'
        """
    )
    op.execute("UPDATE users SET role = 'admin' WHERE is_admin = true")

    op.add_column("jobs", sa.Column("company", sa.String(length=200), nullable=True))
    op.add_column("jobs", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE jobs j
        SET company = c.name,
            owner_id = COALESCE(j.created_by_user_id, cm.user_id)
        FROM companies c
        JOIN company_memberships cm ON cm.company_id = c.id AND cm.role = 'owner'
        WHERE j.company_id = c.id
        """
    )
    op.alter_column("jobs", "owner_id", nullable=False)
    op.create_foreign_key("jobs_owner_id_fkey", "jobs", "users", ["owner_id"], ["id"], ondelete="CASCADE")
    op.create_index(op.f("ix_jobs_owner_id"), "jobs", ["owner_id"], unique=False)

    op.drop_index(op.f("ix_jobs_created_by_user_id"), table_name="jobs")
    op.drop_index(op.f("ix_jobs_company_id"), table_name="jobs")
    op.drop_constraint("fk_jobs_created_by_user_id", "jobs", type_="foreignkey")
    op.drop_constraint("fk_jobs_company_id", "jobs", type_="foreignkey")
    op.drop_column("jobs", "created_by_user_id")
    op.drop_column("jobs", "company_id")

    op.drop_index("uq_company_memberships_one_owner", table_name="company_memberships")
    op.drop_table("company_memberships")
    op.drop_index(op.f("ix_companies_name"), table_name="companies")
    op.drop_index(op.f("ix_companies_id"), table_name="companies")
    op.drop_table("companies")
    op.drop_column("users", "is_admin")
