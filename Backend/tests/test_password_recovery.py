import hashlib
import json
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import security
from app.core.config import settings
from app.core.db import Base, get_db
from app.models import application, company, job, saved_job  # Register relationships.
from app.models.user import User
from app.routes import auth


class FakeRedis:
    def __init__(self):
        self.data = {}
        self.rates = {}

    def setex(self, key, ttl, value):
        self.data[key] = (ttl, value)

    def get(self, key):
        entry = self.data.get(key)
        return entry[1] if entry else None

    def getdel(self, key):
        entry = self.data.pop(key, None)
        return entry[1] if entry else None

    def eval(self, script, numkeys, key, window):
        self.rates[key] = self.rates.get(key, 0) + 1
        return [self.rates[key], int(window)]


@pytest.fixture
def setup():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    app = FastAPI()
    app.include_router(auth.router)
    app.dependency_overrides[get_db] = lambda: db
    fake_redis = FakeRedis()
    sent = []
    with (
        patch.object(auth.redis_client, 'redis_client', fake_redis),
        patch.object(auth, 'send_password_reset_email', side_effect=lambda email, token: sent.append((email, token))),
    ):
        with TestClient(app) as client:
            yield client, db, fake_redis, sent
    db.close()
    engine.dispose()


def add_user(db, *, email='person@example.com', password='old-password', active=True, verified=True):
    user = User(
        name='Person',
        email=email,
        password_hash=security.hash_password(password) if password is not None else '',
        is_active=active,
        email_verified=verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def request_link(client, sent, email='person@example.com'):
    result = client.post('/auth/forgot-password', json={'email': email})
    assert result.status_code == 202
    assert result.headers['cache-control'] == 'no-store'
    return sent[-1][1]


def test_known_unknown_and_ineligible_responses_are_neutral(setup):
    client, db, _, sent = setup
    add_user(db)
    expected = {'message': auth.FORGOT_PASSWORD_MESSAGE}
    known = client.post('/auth/forgot-password', json={'email': 'PERSON@example.com'})
    unknown = client.post('/auth/forgot-password', json={'email': 'missing@example.com'})
    add_user(db, email='inactive@example.com', active=False)
    inactive = client.post('/auth/forgot-password', json={'email': 'inactive@example.com'})
    add_user(db, email='unverified@example.com', verified=False)
    unverified = client.post('/auth/forgot-password', json={'email': 'unverified@example.com'})
    assert all(response.status_code == 202 and response.json() == expected for response in (known, unknown, inactive, unverified))
    assert [email for email, _ in sent] == ['person@example.com']


def test_reset_token_is_hashed_single_use_and_changes_password(setup):
    client, db, redis, sent = setup
    user = add_user(db, password=None)
    token = request_link(client, sent)
    token_key = 'password-reset:token:' + hashlib.sha256(token.encode()).hexdigest()
    assert token_key in redis.data
    assert all(token not in key and token not in value for key, (_, value) in redis.data.items())
    assert json.loads(redis.data[token_key][1]) == {'user_id': user.id, 'auth_version': 0}

    result = client.post('/auth/reset-password', json={'token': token, 'new_password': 'new-password'})
    db.expire_all()
    assert result.status_code == 200
    assert result.headers['cache-control'] == 'no-store'
    assert db.get(User, user.id).auth_version == 1
    assert security.verify_password('new-password', db.get(User, user.id).password_hash)
    assert client.post('/auth/reset-password', json={'token': token, 'new_password': 'again'}).status_code == 400


def test_reset_invalidates_access_and_legacy_tokens(setup):
    client, db, _, sent = setup
    user = add_user(db)
    versioned = security.create_access_token({'sub': str(user.id), 'ver': 0})
    legacy = security.create_access_token({'sub': str(user.id)})
    for token in (versioned, legacy):
        assert client.get('/auth/check-token', headers={'Authorization': f'Bearer {token}'}).status_code == 200
    reset_token = request_link(client, sent)
    assert client.post('/auth/reset-password', json={'token': reset_token, 'new_password': 'new'}).status_code == 200
    for token in (versioned, legacy):
        assert client.get('/auth/check-token', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_new_login_tokens_include_version_and_old_password_fails(setup):
    client, db, _, sent = setup
    add_user(db)
    token = request_link(client, sent)
    assert client.post('/auth/reset-password', json={'token': token, 'new_password': 'new-password'}).status_code == 200
    assert client.post('/auth/login', data={'username': 'person@example.com', 'password': 'old-password'}).status_code == 401
    login = client.post('/auth/login', data={'username': 'person@example.com', 'password': 'new-password'})
    assert login.status_code == 200
    payload = jwt.decode(login.json()['access_token'], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload['ver'] == 1


def test_rate_limit_and_redis_failure(setup):
    client, _, redis, _ = setup
    for _ in range(settings.PASSWORD_RESET_REQUEST_LIMIT):
        assert client.post('/auth/forgot-password', json={'email': 'missing@example.com'}).status_code == 202
    limited = client.post('/auth/forgot-password', json={'email': 'missing@example.com'})
    assert limited.status_code == 429
    assert limited.headers['retry-after'] == str(settings.PASSWORD_RESET_RATE_WINDOW_SECONDS)
    assert limited.headers['cache-control'] == 'no-store'
    with patch.object(redis, 'eval', side_effect=RuntimeError('down')):
        unavailable = client.post('/auth/forgot-password', json={'email': 'different@example.com'})
    assert unavailable.status_code == 503
    assert unavailable.headers['cache-control'] == 'no-store'


@pytest.mark.parametrize('token', ['', 'not-safe!', 'a' * 42, 'a' * 44])
def test_malformed_tokens_share_invalid_response(setup, token):
    client, _, _, _ = setup
    result = client.post('/auth/reset-password', json={'token': token, 'new_password': ''})
    assert result.status_code == 400
    assert result.json()['detail'] == auth.INVALID_RESET_MESSAGE
