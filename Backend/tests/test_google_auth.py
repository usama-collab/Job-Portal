import base64
import hashlib
import json
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.middleware.sessions import SessionMiddleware

from app.core.db import Base, get_db
from app.models import application, company, job, saved_job  # Register relationships.
from app.models.user import User
from app.routes import google_auth as ga

VERIFIER = 'v' * 43
CHALLENGE = base64.urlsafe_b64encode(hashlib.sha256(VERIFIER.encode()).digest()).decode().rstrip('=')


class FakeRedis:
    def __init__(self):
        self.data = {}
        self.now = 0

    def setex(self, key, ttl, value):
        self.data[key] = (self.now + ttl, value)

    def eval(self, script, numkeys, key, challenge):
        entry = self.data.get(key)
        if not entry or entry[0] <= self.now:
            return None
        data = json.loads(entry[1])
        if data['challenge'] != challenge:
            return None
        del self.data[key]
        return str(data['user_id'])


@pytest.fixture
def setup():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    app = FastAPI()
    app.add_middleware(SessionMiddleware, secret_key='test-secret')
    app.include_router(ga.router)
    app.dependency_overrides[get_db] = lambda: db
    redis = FakeRedis()
    async def authorize(request, uri, state):
        return ga.RedirectResponse('https://accounts.google.com/?state=' + state)
    google = AsyncMock()
    google.authorize_redirect.side_effect = authorize
    google.authorize_access_token.return_value = {
        'id_token': 'validated-by-authlib',
        'userinfo': {'sub': 'google-id', 'email': 'person@example.com', 'email_verified': True},
    }
    with patch.object(ga.oauth, 'google', google), patch.object(ga.redis_client, 'redis_client', redis):
        with TestClient(app) as client:
            yield client, db, redis, google
    db.close()
    engine.dispose()


def callback(client):
    start = client.get('/googleauth/login', params={'challenge': CHALLENGE}, follow_redirects=False)
    state = parse_qs(urlsplit(start.headers['location']).query)['state'][0]
    result = client.get('/googleauth/google/callback', params={'state': state, 'code': 'google-code'}, follow_redirects=False)
    assert result.status_code == 303
    assert result.headers['cache-control'] == 'no-store'
    assert 'access_token' not in result.headers['location']
    return parse_qs(urlsplit(result.headers['location']).fragment)


def exchange(client, code, verifier=VERIFIER):
    return client.post('/googleauth/exchange', json={'code': code, 'verifier': verifier})


def test_new_account_and_single_use(setup):
    client, db, redis, google = setup
    code = callback(client)['code'][0]
    user = db.query(User).one()
    assert user.name == 'person' and user.email_verified
    assert redis.data['google-handoff:' + code][0] == 60
    result = exchange(client, code)
    assert result.status_code == 200
    assert result.headers['cache-control'] == 'no-store'
    assert ga.redis_client.refresh_token_key(result.json()['refresh_token']) in redis.data
    assert exchange(client, code).status_code == 400


def test_existing_profile_preserved(setup):
    client, db, _, google = setup
    db.add(User(name='Original', email='person@example.com', password_hash='existing', bio='Keep me', email_verified=False))
    db.commit()
    assert 'code' in callback(client)
    user = db.query(User).one()
    assert (user.name, user.password_hash, user.bio, user.email_verified) == ('Original', 'existing', 'Keep me', True)


@pytest.mark.parametrize('claims', [None, {}, {'sub': 'id'}, {'sub': 'id', 'email': 'person@example.com', 'email_verified': False}, {'sub': 'id', 'email': 'person@example.com', 'email_verified': 'true'}, {'email': 'person@example.com', 'email_verified': True}])
def test_invalid_claims(setup, claims):
    client, db, _, google = setup
    google.authorize_access_token.return_value = {'id_token': 'token', 'userinfo': claims}
    assert callback(client)['error'] == ['invalid_identity']
    assert db.query(User).count() == 0


def test_requires_id_token(setup):
    client, _, _, google = setup
    del google.authorize_access_token.return_value['id_token']
    assert callback(client)['error'] == ['invalid_identity']


def test_inactive_and_eligibility_recheck(setup):
    client, db, _, _ = setup
    code = callback(client)['code'][0]
    db.query(User).one().is_active = False
    db.commit()
    assert exchange(client, code).status_code == 403
    assert callback(client)['error'] == ['inactive']


def test_mismatch_does_not_consume_and_expiry(setup):
    client, _, redis, _ = setup
    code = callback(client)['code'][0]
    assert exchange(client, code, 'x' * 43).status_code == 400
    assert exchange(client, code).status_code == 200
    code = callback(client)['code'][0]
    redis.now = 61
    assert exchange(client, code).status_code == 400


@pytest.mark.parametrize('error, expected', [(ga.OAuthError(error='access_denied'), 'cancelled'), (ga.OAuthError(error='mismatching_state'), 'invalid_state'), (RuntimeError('network'), 'unavailable')])
def test_oauth_failure(setup, error, expected):
    client, _, _, google = setup
    google.authorize_access_token.side_effect = error
    assert callback(client)['error'] == [expected]


def test_invalid_state_and_start_challenge(setup):
    client, _, _, google = setup
    assert client.get('/googleauth/login').status_code == 422
    result = client.get('/googleauth/google/callback?state=wrong', follow_redirects=False)
    assert 'error=invalid_state' in result.headers['location']
    google.authorize_access_token.assert_not_awaited()


def test_redis_unavailable(setup):
    client, _, redis, _ = setup
    with patch.object(redis, 'setex', side_effect=RuntimeError()):
        assert callback(client)['error'] == ['unavailable']
    code = callback(client)['code'][0]
    with patch.object(redis, 'eval', side_effect=RuntimeError()):
        assert exchange(client, code).status_code == 503


def test_long_name_truncated(setup):
    client, db, _, google = setup
    google.authorize_access_token.return_value['userinfo']['name'] = 'N' * 100
    callback(client)
    assert len(db.query(User).one().name) == 50
