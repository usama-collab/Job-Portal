"""Use isolated SQLite, or disposable PostgreSQL via NOTIFICATION_TEST_DATABASE_URL."""
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import importlib.util
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import event
from app.core.db import get_db
from app.crud import conversation as crud
from app.crud.notification import visible_notifications
from app.models.company import CompanyMembership
from app.models.conversation import Conversation, ConversationRead, Message
from app.models.notification import Notification
from app.routes import conversation as routes
from app.routes.notification import router as notifications_router
from app.schemas.conversation import SendMessage
from app.utils.functions import get_current_user
from test_notifications import database, scenario, apply


@pytest.fixture
def api(scenario, monkeypatch):
    db, _, _, owner, *_ = scenario
    current = {"user": owner}
    app = FastAPI()
    app.include_router(routes.router)
    app.include_router(notifications_router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: current["user"]
    monkeypatch.setattr(routes, "enforce_send_limit", lambda _: None)
    with TestClient(app) as client:
        yield client, current


def send(client, application, body="Hello", key=None):
    return client.post(f"/applications/{application.id}/messages", json={"body": body, "client_message_id": key or str(uuid4())})


def test_empty_authorization_and_delivery(scenario, api):
    db, _, _, owner, manager, seeker, outsider, admin, _, job = scenario
    application = apply(scenario)
    client, current = api
    url = f"/applications/{application.id}"
    for participant in [owner, manager, seeker]:
        current["user"] = participant
        assert client.get(url + "/conversation").status_code == 200
        assert client.get(url + "/messages").json()["items"] == []
    assert db.query(Conversation).count() == 0
    for stranger in [outsider, admin]:
        current["user"] = stranger
        assert client.get(url + "/conversation").status_code == 404
        assert client.get(url + "/messages").status_code == 404
        assert send(client, application).status_code == 404
        assert client.patch(url + "/conversation/read", json={"last_read_message_id": 1}).status_code == 404
        assert client.get('/conversations').json()['items'] == []
    current["user"] = seeker
    result = send(client, application)
    assert result.status_code == 201
    assert result.headers['cache-control'] == 'no-store'
    rows = db.query(Notification).filter_by(type="application_message_received").all()
    assert {r.recipient_id for r in rows} == {owner.id, manager.id}
    assert all('Hello' not in r.message for r in rows)
    current['user'] = owner
    assert client.get('/conversations/unread-count').json()['unread_count'] == 1
    assert client.get('/conversations').json()['items'][0]['unread_count'] == 1
    assert any(n['target_path'] == f'/messages/{application.id}' for n in client.get('/notifications').json()['items'])


def test_retry_validation_and_cursor_isolation(scenario, api):
    db, *_ = scenario
    application = apply(scenario)
    client, current = api
    key = str(uuid4())
    first = send(client, application, '  hello  ', key)
    assert first.status_code == 201
    assert first.json()['body'] == 'hello'
    assert send(client, application, 'hello', key).status_code == 200
    assert send(client, application, 'different', key).status_code == 409
    assert db.query(Message).count() == 1
    for body in ['', '  ', 'x' * 5001, '\x00']:
        assert send(client, application, body).status_code == 422
    path = f'/applications/{application.id}/messages'
    assert client.post(path, json={'body': 'hey', 'client_message_id': str(uuid4()), 'sender_id': 4}).status_code == 422
    assert client.get(path, params={'before_id': 99999}).status_code == 422
    assert client.get(path, params={'after_id': first.json()['id'], 'before_id': first.json()['id']}).status_code == 422
    assert client.get(path, params={'limit': 101}).status_code == 422
    for _ in range(5):
        send(client, application)
    latest = client.get(path, params={'limit': 2}).json()
    assert len(latest['items']) == 2
    older = client.get(path, params={'limit': 2, 'before_id': latest['next_before_id']}).json()
    assert older['items'][-1]['id'] < latest['items'][0]['id']
    after = client.get(path, params={'limit': 2, 'after_id': first.json()['id']}).json()
    assert after['next_after_id'] == after['items'][-1]['id']


def test_individual_reads_notification_independence_and_revocation(scenario, api):
    db, _, _, owner, manager, seeker, *_ = scenario
    application = apply(scenario)
    client, current = api
    current['user'] = seeker
    first = send(client, application).json()['id']
    second = send(client, application).json()['id']
    current['user'] = owner
    client.patch('/notifications/read-all')
    assert client.get('/conversations/unread-count').json()['unread_count'] == 2
    path = f'/applications/{application.id}/conversation/read'
    assert client.patch(path, json={'last_read_message_id': first}).status_code == 200
    assert client.get('/conversations/unread-count').json()['unread_count'] == 1
    client.patch(path, json={'last_read_message_id': second})
    assert client.patch(path, json={'last_read_message_id': first}).json()['last_read_message_id'] == second
    current['user'] = manager
    assert client.get('/conversations/unread-count').json()['unread_count'] == 2
    client.patch(path, json={'last_read_message_id': second})
    assert db.query(Notification).filter_by(recipient_id=manager.id, type='application_message_received', read_at=None).count() == 0
    db.query(CompanyMembership).filter_by(user_id=manager.id).delete()
    db.commit()
    assert client.get(f'/applications/{application.id}/messages').status_code == 404
    assert client.get('/conversations').json()['items'] == []
    assert client.get('/conversations/unread-count').json()['unread_count'] == 0
    assert client.get('/notifications').json()['items'] == []


def test_statuses_deletion_and_rollback(scenario, api):
    db, _, _, owner, manager, seeker, *_, job = scenario
    application = apply(scenario)
    client, current = api
    job.is_active = False
    for status in ['applied', 'under_review', 'shortlisted', 'hired', 'rejected']:
        application.status = status
        db.commit()
        assert send(client, application).status_code == 201
    before = db.query(Message).count()
    def fail_notification(mapper, connection, target):
        raise RuntimeError('notification failure')
    event.listen(Notification, 'before_insert', fail_notification)
    try:
        with pytest.raises(RuntimeError):
            crud.send_message(application.id, SendMessage(body='rollback', client_message_id=uuid4()), owner, db)
    finally:
        event.remove(Notification, 'before_insert', fail_notification)
    assert db.query(Message).count() == before
    db.delete(application)
    db.commit()
    assert db.query(Conversation).count() == db.query(Message).count() == db.query(ConversationRead).count() == 0
    assert visible_notifications(seeker, db).filter_by(type='application_message_received').count() == 0


def test_rate_limit_and_auth(monkeypatch):
    from redis.exceptions import ConnectionError
    monkeypatch.setattr(routes.redis_client.redis_client, 'eval', lambda *args: [31, 23])
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        routes.enforce_send_limit(1)
    assert error.value.status_code == 429
    assert error.value.headers['Retry-After'] == '23'
    def unavailable(*args):
        raise ConnectionError()
    monkeypatch.setattr(routes.redis_client.redis_client, 'eval', unavailable)
    with pytest.raises(HTTPException) as error:
        routes.enforce_send_limit(1)
    assert error.value.status_code == 503
    app = FastAPI()
    app.include_router(routes.router)
    with TestClient(app) as client:
        assert client.get('/conversations').status_code == 401
        assert client.get('/conversations', headers={'Authorization': 'Bearer invalid'}).status_code == 401


def test_postgres_simultaneous_first_retry(scenario):
    db, factory, engine, owner, *_ = scenario
    if engine.dialect.name != 'postgresql':
        pytest.skip('Requires disposable PostgreSQL via NOTIFICATION_TEST_DATABASE_URL')
    application = apply(scenario)
    application_id, owner_id = application.id, owner.id
    payload = SendMessage(body='Concurrent', client_message_id=uuid4())
    barrier = Barrier(2)
    def run(_):
        from app.models.user import User
        with factory() as session:
            user = session.get(User, owner_id)
            barrier.wait(timeout=10)
            return crud.send_message(application_id, payload, user, session)[1]
    with ThreadPoolExecutor(2) as executor:
        assert sorted(executor.map(run, range(2))) == [False, True]
    assert db.query(Conversation).count() == db.query(Message).count() == 1


def test_migration_round_trip(scenario):
    db, _, engine, *_ = scenario
    db.close()
    path = Path(__file__).parents[1] / 'alembic/versions/9f2c6d8e104a_application_messaging.py'
    spec = importlib.util.spec_from_file_location('message_migration', path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            migration.downgrade()
            migration.upgrade()


def test_new_membership_deleted_sender_and_foreign_cursor(scenario, api):
    db, _, _, owner, manager, seeker, outsider, *_ = scenario
    application = apply(scenario)
    client, current = api
    first = send(client, application).json()['id']
    company_id = application.job.company_id
    db.add(CompanyMembership(company_id=company_id, user_id=outsider.id, role='manager'))
    db.commit()
    current['user'] = outsider
    assert client.get(f'/applications/{application.id}/messages').json()['items'][0]['id'] == first
    assert client.get('/conversations/unread-count').json()['unread_count'] == 1
    from app.models.application import Application
    other = Application(job_id=application.job_id, user_id=outsider.id, status='applied')
    db.add(other)
    db.commit()
    current['user'] = seeker
    assert client.get(f'/applications/{other.id}/messages').status_code == 404
    current['user'] = owner
    other_message = send(client, other).json()['id']
    assert client.get(f'/applications/{application.id}/messages', params={'after_id': other_message}).status_code == 422
    assert client.patch(f'/applications/{application.id}/conversation/read', json={'last_read_message_id': other_message}).status_code == 422
    db.delete(owner)
    db.commit()
    current['user'] = seeker
    history = client.get(f'/applications/{application.id}/messages').json()
    assert history['items'][0]['sender_name'] == 'Deleted user'
    assert history['items'][0]['sender_id'] is None


def test_applicant_company_member_is_not_notified_twice(scenario, api):
    db, _, _, owner, manager, *_ = scenario
    from app.models.application import Application
    job = scenario[-1]
    application = Application(job_id=job.id, user_id=owner.id, status='applied')
    db.add(application)
    db.commit()
    client, current = api
    assert send(client, application).status_code == 201
    assert db.query(Notification).filter_by(type='application_message_received').count() == 1
    assert db.query(Notification).one().recipient_id == manager.id
    assert client.get('/conversations/unread-count').json()['unread_count'] == 0
    current['user'] = manager
    assert send(client, application).status_code == 201
    assert db.query(Notification).filter_by(recipient_id=owner.id).count() == 1


@pytest.mark.parametrize('field', ['is_active', 'email_verified'])
def test_unavailable_participant_authentication_and_delivery(scenario, api, field):
    db, _, _, owner, manager, seeker, *_ = scenario
    application = apply(scenario)
    client, current = api
    setattr(manager, field, False)
    db.commit()
    assert send(client, application).status_code == 201
    assert db.query(Notification).filter_by(type='application_message_received', recipient_id=manager.id).count() == 0
    from app.core.security import create_access_token
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as authenticated:
        token = create_access_token({'sub': str(manager.id), 'ver': manager.auth_version})
        assert authenticated.get('/conversations', headers={'Authorization': f'Bearer {token}'}).status_code == 403


def test_postgres_simultaneous_sends_and_read(scenario):
    db, factory, engine, owner, _, seeker, *_ = scenario
    if engine.dialect.name != 'postgresql':
        pytest.skip('Requires disposable PostgreSQL via NOTIFICATION_TEST_DATABASE_URL')
    application = apply(scenario)
    first, _ = crud.send_message(application.id, SendMessage(body='First', client_message_id=uuid4()), owner, db)
    application_id, owner_id, seeker_id = application.id, owner.id, seeker.id
    barrier = Barrier(3)
    def run(index):
        from app.models.user import User
        with factory() as session:
            user = session.get(User, seeker_id if index == 0 else owner_id)
            barrier.wait(timeout=10)
            if index == 0:
                return crud.mark_read(application_id, first['id'], user, session)
            return crud.send_message(application_id, SendMessage(body=f'Next {index}', client_message_id=uuid4()), user, session)
    with ThreadPoolExecutor(3) as executor:
        list(executor.map(run, range(3)))
    db.expire_all()
    assert crud.unread_count(seeker, db) == 2
    assert db.query(Conversation).one().last_message_id == db.query(Message).order_by(Message.id.desc()).first().id
