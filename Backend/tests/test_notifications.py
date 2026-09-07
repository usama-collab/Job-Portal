"""Isolated notification tests; optionally exercise real PostgreSQL locking.

NOTIFICATION_TEST_DATABASE_URL must point to a disposable test database. Each
test uses its own generated schema; the application's DATABASE_URL is never used.
"""
import importlib.util
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateSchema, DropSchema

from app.core.db import Base, get_db
from app.crud import application as applications
from app.crud.notification import visible_notifications
from app.models.application import Application
from app.models.company import Company, CompanyMembership
from app.models.job import Job
from app.models.notification import Notification
from app.models.saved_job import SavedJob  # register all shared metadata
from app.models.user import User
from app.routes import application as application_routes
from app.routes.notification import router
from app.utils.functions import get_current_user


@pytest.fixture
def database():
    url = os.environ.get("NOTIFICATION_TEST_DATABASE_URL")
    admin_engine = None
    if url:
        schema = f"notification_test_{uuid4().hex}"
        admin_engine = create_engine(url)
        with admin_engine.begin() as connection:
            connection.execute(CreateSchema(schema))
        engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    else:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db:
        yield db, factory, engine
    if admin_engine:
        engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin_engine.dispose()
    else:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def scenario(database):
    db, factory, engine = database
    owner, manager, seeker, outsider, admin = [
        User(name=name, email=f"{name}@example.com", password_hash="test", email_verified=True, is_admin=name == "admin")
        for name in ("owner", "manager", "seeker", "outsider", "admin")
    ]
    company = Company(name="Acme")
    db.add_all([owner, manager, seeker, outsider, admin, company])
    db.flush()
    db.add_all([
        CompanyMembership(company_id=company.id, user_id=owner.id, role="owner"),
        CompanyMembership(company_id=company.id, user_id=manager.id, role="manager"),
    ])
    job = Job(title="Engineer", description="Build things", company_id=company.id, created_by_user_id=outsider.id)
    db.add(job)
    db.commit()
    return db, factory, engine, owner, manager, seeker, outsider, admin, company, job


def apply(scenario):
    db, _, _, _, _, seeker, *_, job = scenario
    return applications.create_application(job.id, seeker.id, None, None, None, db)


@pytest.fixture
def api(scenario):
    db, _, _, owner, *_ = scenario
    current = {"user": owner}
    app = FastAPI()
    app.include_router(router)
    app.include_router(application_routes.router)
    app.dependency_overrides[get_current_user] = lambda: current["user"]
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as client:
        yield client, current


def test_owner_only_and_creator_is_not_recipient(scenario):
    db, _, _, owner, manager, seeker, outsider, admin, _, job = scenario
    application = apply(scenario)
    row = db.query(Notification).one()
    assert row.recipient_id == owner.id
    assert row.application_id == application.id
    assert row.type == "application_received"
    assert "seeker applied for Engineer at Acme" in row.message
    for user in (manager, seeker, outsider, admin):
        assert visible_notifications(user, db).count() == 0
    # Owners can still apply; they do not receive alerts for their own submission.
    applications.create_application(job.id, owner.id, None, None, None, db)
    assert db.query(Notification).count() == 1


@pytest.mark.parametrize("field", ["is_active", "email_verified"])
def test_unavailable_owner_is_not_notified(scenario, field):
    db, _, _, owner, *_ = scenario
    setattr(owner, field, False)
    db.commit()
    apply(scenario)
    assert db.query(Notification).count() == 0


def test_status_noop_and_repeated_transitions(scenario):
    db, _, _, _, _, seeker, *_ = scenario
    application = apply(scenario)
    for status, expected in [("applied", False), ("shortlisted", True), ("shortlisted", False), ("under_review", True), ("shortlisted", True)]:
        updated, changed = applications.update_application_status(application.id, status, db)
        assert changed is expected
        assert updated.status == status
    rows = visible_notifications(seeker, db).all()
    assert len(rows) == 3
    assert "Under review to Shortlisted" in rows[-1].message


def test_failed_notification_rolls_back_application(scenario, monkeypatch):
    db = scenario[0]
    def fail(*args):
        raise RuntimeError("notification failure")
    monkeypatch.setattr(applications, "notify_application_received", fail)
    with pytest.raises(RuntimeError):
        apply(scenario)
    assert db.query(Application).count() == 0
    assert db.query(Notification).count() == 0


def test_failed_notification_rolls_back_status(scenario, monkeypatch):
    db = scenario[0]
    application = apply(scenario)
    def fail(*args):
        raise RuntimeError("notification failure")
    monkeypatch.setattr(applications, "notify_status_changed", fail)
    with pytest.raises(RuntimeError):
        applications.update_application_status(application.id, "hired", db)
    db.refresh(application)
    assert application.status == "applied"
    assert db.query(Notification).count() == 1


def test_list_count_read_and_recipient_isolation(scenario, api):
    db, _, _, owner, _, seeker, outsider, admin, *_ = scenario
    application = apply(scenario)
    client, current = api
    response = client.get("/notifications")
    assert response.headers["cache-control"] == "no-store"
    row = response.json()["items"][0]
    assert row["target_path"].endswith(f"?applicationId={application.id}")
    assert client.get("/notifications/unread-count").json() == {"unread_count": 1}
    for user in (seeker, outsider, admin):
        current["user"] = user
        assert client.get("/notifications").json()["items"] == []
        assert client.patch(f'/notifications/{row["id"]}/read').status_code == 404
        assert client.patch("/notifications/read-all").json() == {"updated_count": 0}
    current["user"] = owner
    first = client.patch(f'/notifications/{row["id"]}/read').json()
    second = client.patch(f'/notifications/{row["id"]}/read').json()
    assert first["read_at"] == second["read_at"]
    assert client.get("/notifications/unread-count").json() == {"unread_count": 0}
    assert client.get("/notifications?unread_only=true").json()["items"] == []


def test_pagination_mark_all_and_membership_revocation(scenario, api):
    db, _, _, owner, *_ = scenario
    apply(scenario)
    original = db.query(Notification).one()
    for i in range(24):
        db.add(Notification(recipient_id=owner.id, type=original.type, company_id=original.company_id,
                            title="Update", message=str(i), created_at=original.created_at))
    db.commit()
    client, _ = api
    first = client.get("/notifications?limit=20").json()
    second = client.get("/notifications", params={"cursor": first["next_cursor"]}).json()
    assert len(first["items"]) == 20 and len(second["items"]) == 5
    assert not {r["id"] for r in first["items"]} & {r["id"] for r in second["items"]}
    assert second["next_cursor"] is None
    assert client.patch("/notifications/read-all").json() == {"updated_count": 25}
    assert client.patch("/notifications/read-all").json() == {"updated_count": 0}
    db.add(Notification(recipient_id=owner.id, type=original.type, company_id=original.company_id, title="Later", message="Later"))
    db.commit()
    assert client.get("/notifications/unread-count").json()["unread_count"] == 1
    db.query(CompanyMembership).filter_by(user_id=owner.id).delete()
    db.commit()
    assert client.get("/notifications").json()["items"] == []
    assert client.get("/notifications/unread-count").json()["unread_count"] == 0
    assert client.patch("/notifications/read-all").json()["updated_count"] == 0


@pytest.mark.parametrize("params", [{"cursor": "!bad"}, {"cursor": "e30="}, {"limit": 0}, {"limit": 51}])
def test_invalid_pagination(api, params):
    client, _ = api
    assert client.get("/notifications", params=params).status_code == 422


def test_deleted_targets_and_recipient(scenario, api):
    db, _, _, owner, _, seeker, *_ = scenario
    application = apply(scenario)
    applications.update_application_status(application.id, "hired", db)
    db.delete(application)
    db.commit()
    db.expire_all()
    client, current = api
    assert client.get("/notifications").json()["items"][0]["target_path"] is None
    current["user"] = seeker
    assert client.get("/notifications").json()["items"][0]["target_path"] is None
    db.delete(owner)
    db.commit()
    assert db.query(Notification).filter_by(recipient_id=owner.id).count() == 0


def test_noop_status_does_not_email_and_outsider_cannot_change(scenario, api, monkeypatch):
    _, _, _, owner, _, _, outsider, *_ = scenario
    application = apply(scenario)
    emails = []
    monkeypatch.setattr(application_routes, "send_app_status_email", lambda *args: emails.append(args))
    client, current = api
    endpoint = f"/applications/{application.id}/status"
    current["user"] = outsider
    assert client.put(endpoint, json={"status": "hired"}).status_code == 403
    current["user"] = owner
    assert client.put(endpoint, json={"status": "applied"}).status_code == 200
    assert emails == []
    assert client.put(endpoint, json={"status": "hired"}).status_code == 200
    assert len(emails) == 1


def test_requires_authentication():
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        assert client.get("/notifications").status_code == 401
        assert client.get("/notifications", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_postgres_concurrent_status_updates(scenario):
    db, factory, engine, *_ = scenario
    if engine.dialect.name != "postgresql":
        pytest.skip("Requires isolated PostgreSQL via NOTIFICATION_TEST_DATABASE_URL")
    application = apply(scenario)
    barrier = Barrier(2)
    def update():
        with factory() as session:
            session.get(Application, application.id)  # simulate route's initial lookup
            barrier.wait(timeout=10)
            return applications.update_application_status(application.id, "hired", session)[1]
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: update(), range(2)))
    assert sorted(results) == [False, True]
    assert db.query(Notification).filter_by(type="application_status_changed").count() == 1


def test_notification_migration_round_trip(scenario):
    db, _, engine, owner, *_ = scenario
    owner_id = owner.id
    db.close()
    Notification.__table__.drop(engine)
    path = Path(__file__).parents[1] / "alembic/versions/6b20d9a43f81_add_notifications.py"
    spec = importlib.util.spec_from_file_location("notification_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert connection.execute(select(User.id).where(User.id == owner_id)).scalar_one() == owner_id
            migration.downgrade()
            migration.upgrade()
