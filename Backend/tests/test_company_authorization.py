import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base
from app.crud.company import create_company
from app.crud.application import create_application
from app.crud.job import get_jobs_for_company
from app.models.application import Application
from app.models.company import Company, CompanyMembership
from app.models.job import Job
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.company import CompanyCreate
from app.schemas.job import EmployerJobOut, JobCreate
from app.schemas.user import UserCreate
from app.utils.functions import can_manage_company
from app.core.security import create_access_token, verify_access_token


class CompanyAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def add_user(self, email: str, *, is_admin: bool = False) -> User:
        user = User(
            name=email.split("@")[0],
            email=email,
            password_hash="test",
            email_verified=True,
            is_admin=is_admin,
        )
        self.db.add(user)
        self.db.commit()
        return user

    def test_registration_rejects_privilege_fields(self):
        with self.assertRaises(ValidationError):
            UserCreate.model_validate({
                "name": "Mallory",
                "email": "mallory@example.com",
                "password": "password",
                "is_admin": True,
            })
        with self.assertRaises(ValidationError):
            UserCreate.model_validate({
                "name": "Mallory",
                "email": "mallory@example.com",
                "password": "password",
                "role": "employer",
            })

    def test_access_tokens_carry_identity_not_authorization(self):
        token = create_access_token({"sub": "42"})
        payload = verify_access_token(token)
        self.assertEqual("42", payload["sub"])
        self.assertNotIn("role", payload)
        self.assertNotIn("is_admin", payload)

    def test_job_payload_rejects_client_supplied_company(self):
        with self.assertRaises(ValidationError):
            JobCreate.model_validate({
                "title": "Engineer",
                "description": "Build things",
                "company": "Pretend Company",
            })

    def test_onboarding_creates_owner_and_blocks_second_company(self):
        user = self.add_user("owner@example.com")
        company = create_company(CompanyCreate(name="Acme"), user.id, self.db)
        membership = self.db.query(CompanyMembership).filter_by(user_id=user.id).one()
        self.assertEqual(company.id, membership.company_id)
        self.assertEqual("owner", membership.role)
        with self.assertRaisesRegex(Exception, "already belong"):
            create_company(CompanyCreate(name="Other"), user.id, self.db)

    def test_company_membership_not_creator_id_controls_access(self):
        owner = self.add_user("owner@example.com")
        outsider = self.add_user("outsider@example.com")
        admin = self.add_user("admin@example.com", is_admin=True)
        company = create_company(CompanyCreate(name="Acme"), owner.id, self.db)
        job = Job(
            title="Engineer",
            description="Build things",
            company_id=company.id,
            created_by_user_id=outsider.id,
            is_active=True,
        )
        self.db.add(job)
        self.db.commit()

        self.assertTrue(can_manage_company(owner, company.id, self.db))
        self.assertFalse(can_manage_company(outsider, company.id, self.db))
        self.assertTrue(can_manage_company(admin, company.id, self.db))

    def test_company_owner_can_still_apply(self):
        owner = self.add_user("owner@example.com")
        company = create_company(CompanyCreate(name="Acme"), owner.id, self.db)
        job = Job(
            title="Engineer",
            description="Build things",
            company_id=company.id,
            created_by_user_id=owner.id,
            is_active=True,
        )
        self.db.add(job)
        self.db.commit()

        application = create_application(job.id, owner.id, None, None, None, self.db)
        self.assertEqual(owner.id, application.user_id)

        listing = get_jobs_for_company(company.id, self.db)[0]
        response = EmployerJobOut.model_validate(listing)
        self.assertEqual(1, response.applications_count)


if __name__ == "__main__":
    unittest.main()
