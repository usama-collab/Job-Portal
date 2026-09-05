from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import relationship

from app.core.db import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    website = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    logo_path = Column(String(512), nullable=True)
    logo_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    memberships = relationship("CompanyMembership", back_populates="company", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="company_record", cascade="all, delete-orphan")


class CompanyMembership(Base):
    __tablename__ = "company_memberships"

    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(30), nullable=False, default="owner", server_default="owner")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship("Company", back_populates="memberships")
    user = relationship("User", back_populates="company_memberships")

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_company_memberships_user_id"),
        CheckConstraint("role IN ('owner', 'manager')", name="ck_company_membership_role"),
        Index(
            "uq_company_memberships_one_owner",
            "company_id",
            unique=True,
            postgresql_where=text("role = 'owner'"),
            sqlite_where=text("role = 'owner'"),
        ),
    )
