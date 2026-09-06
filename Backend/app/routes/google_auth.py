import base64
import hashlib
import json
import logging
import secrets
from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.requests import Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import redis_client, security
from app.core.config import settings
from app.core.db import get_db
from app.models.user import User
from app.schemas.token import TokenOut

router = APIRouter(prefix="/googleauth", tags=["Google Auth"])
logger = logging.getLogger(__name__)
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def frontend_redirect(**params):
    return RedirectResponse(
        f'{settings.FRONTEND_ORIGIN.rstrip("/")}/auth/google/callback#{urlencode(params)}',
        status_code=303,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


@router.get('/login')
async def google_login(request: Request, challenge: str = Query(pattern=r"^[A-Za-z0-9_-]{43}$")):
    state = secrets.token_urlsafe(32)
    # A single pending attempt keeps the signed session cookie bounded.
    request.session['google_handoff'] = {"state": state, "challenge": challenge}
    try:
        return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI, state=state)
    except Exception:
        request.session.pop('google_handoff', None)
        return frontend_redirect(error="unavailable")


@router.get('/google/callback')
async def google_callback(request: Request, db: Session = Depends(get_db)):
    pending = request.session.pop('google_handoff', None)
    if not pending or not secrets.compare_digest(pending['state'], request.query_params.get('state', '')):
        return frontend_redirect(error="invalid_state")
    try:
        # Authlib validates signature, issuer, audience, expiry, nonce and OAuth state.
        token = await oauth.google.authorize_access_token(request)
        claims = token.get('userinfo')
        if (not token.get('id_token') or not claims
                or not isinstance(claims.get('sub'), str) or not claims['sub']
                or claims.get('email_verified') is not True
                or not isinstance(claims.get('email'), str)
                or not claims['email'].strip() or '@' not in claims['email']):
            return frontend_redirect(error="invalid_identity")
        email = claims['email']
        user = db.query(User).filter(User.email == email).first()
        if not user:
            name = claims.get('name')
            name = name.strip() if isinstance(name, str) else ''
            user = User(name=(name or email.split('@')[0])[:50], email=email,
                        password_hash="", email_verified=True)
            db.add(user)
            try:
                db.commit()
                db.refresh(user)
            except IntegrityError:
                db.rollback()
                user = db.query(User).filter(User.email == email).one()
        if not user.is_active:
            return frontend_redirect(error="inactive")
        if not user.email_verified:
            user.email_verified = True
            db.commit()
        code = secrets.token_urlsafe(32)
        redis_client.redis_client.setex(
            f"google-handoff:{code}", 60,
            json.dumps({"user_id": user.id, "challenge": pending['challenge']}),
        )
        return frontend_redirect(code=code)
    except OAuthError as exc:
        return frontend_redirect(error="cancelled" if exc.error == "access_denied" else "invalid_state")
    except Exception:
        db.rollback()
        # Do not log OAuth codes, identity claims, or tokens.
        logger.warning("Google authentication could not be completed")
        return frontend_redirect(error="unavailable")


class GoogleExchange(BaseModel):
    code: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")
    verifier: str = Field(pattern=r"^[A-Za-z0-9_-]{43,128}$")


# Comparison and consumption are one Redis operation; mismatches do not burn a code.
CONSUME_HANDOFF = """
local value = redis.call('GET', KEYS[1])
if not value then return nil end
local data = cjson.decode(value)
if data.challenge ~= ARGV[1] then return nil end
redis.call('DEL', KEYS[1])
return tostring(data.user_id)
"""


@router.post('/exchange', response_model=TokenOut)
def exchange_google_code(payload: GoogleExchange, response: Response, db: Session = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    challenge = base64.urlsafe_b64encode(hashlib.sha256(payload.verifier.encode()).digest()).decode().rstrip('=')
    try:
        identity = redis_client.redis_client.eval(CONSUME_HANDOFF, 1, f"google-handoff:{payload.code}", challenge)
        if not identity:
            raise HTTPException(status_code=400, detail="Google sign-in expired or is invalid. Please try again.")
        user = db.query(User).filter(User.id == int(identity)).first()
        if not user or not user.is_active or not user.email_verified:
            raise HTTPException(status_code=403, detail="This account is not available.")
        token_data = {'sub': str(user.id), 'ver': user.auth_version}
        access = security.create_access_token(token_data)
        refresh = security.create_refresh_token(token_data)
        redis_client.redis_client.setex(redis_client.refresh_token_key(refresh),
                                       settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600, str(user.id))
        return TokenOut(access_token=access, refresh_token=refresh)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Google sign-in is unavailable. Please try again.")
