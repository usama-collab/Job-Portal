import re
import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from app.utils.functions import get_current_user
from app.core.db import get_db
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from app.core import redis_client, security
from app.models.user import User
from app.schemas.token import RefreshRequest, TokenOut
from app.schemas.user import ForgotPasswordRequest, ResetPasswordRequest
from app.core.config import settings
from app.utils.send_email import send_password_reset_email
from jose import JWTError
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError


router = APIRouter(prefix='/auth', tags=["Auth"])

FORGOT_PASSWORD_MESSAGE = "If an eligible account exists, a reset link has been sent."
RESET_PASSWORD_MESSAGE = "Password reset successfully."
INVALID_RESET_MESSAGE = "This password reset link is invalid or has expired."
RESET_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


def _versioned_token_data(user: User) -> dict[str, str | int]:
    return {"sub": str(user.id), "ver": user.auth_version}



# Email Confirmation
@router.get('/confirm')
def confirm_email(token: str, db: Session = Depends(get_db)):
    try:
        payload = security.verify_confirmation_token(token)
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired confirmation token")

    if not payload:
        raise HTTPException(status_code=400, detail="Invalid/Expired token")
    
    email = payload.get('email')
    user = crud_user.get_user_by_email(email, db)
    
    if user.email_verified:
        return HTMLResponse(content="<h1>Email Already Verified!</h1>")
    
    crud_user.verify_user_email(user, db)
    login_url = f'{settings.FRONTEND_ORIGIN.rstrip("/")}/login'
    return RedirectResponse(url=login_url, status_code=303)


# Login
@router.post('/login', response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    password_valid = False
    if user:
        try:
            password_valid = security.verify_password(form_data.password, user.password_hash)
        except (TypeError, ValueError):
            password_valid = False

    if not user or not password_valid or not user.is_active or not user.email_verified:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
            headers={'WWW-Authenticate': 'Bearer'},
        )
    
    access_token = security.create_access_token(_versioned_token_data(user))
    refresh_token = security.create_refresh_token(_versioned_token_data(user))
    
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    redis_client.redis_client.setex(
        redis_client.refresh_token_key(refresh_token),
        ttl,
        str(user.id),
    )

    return TokenOut(access_token=access_token, refresh_token=refresh_token)


# Refreshing the access token for the better user experience
@router.post('/refresh', response_model=TokenOut)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    old_refresh_token = payload.refresh_token

    try:
        token_payload = security.verify_refresh_token(old_refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    subject = token_payload.get('sub')
    if not isinstance(subject, str) or not subject.isdigit():
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    current_user = db.query(User).filter(User.id == int(subject)).first()
    if not current_user or not current_user.is_active or not current_user.email_verified:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_version = token_payload.get('ver', 0)
    if type(token_version) is not int or token_version != current_user.auth_version:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_data = _versioned_token_data(current_user)
    new_access = security.create_access_token(token_data)
    new_refresh = security.create_refresh_token(token_data)

    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    rotated = redis_client.rotate_refresh_token(
        old_refresh_token,
        new_refresh,
        ttl,
        str(current_user.id),
    )
    if not rotated:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return TokenOut(access_token=new_access, refresh_token=new_refresh)


# Logout and Deleting the redis refresh token
@router.post('/logout')
def logout(payload: RefreshRequest):
    old_refresh_token = payload.refresh_token
    redis_client.redis_client.delete(redis_client.refresh_token_key(old_refresh_token))
    return {'message': 'Logged Out'}
        

    
# Check token if it is valid
@router.get('/check-token')
def check_token(current_user: User = Depends(get_current_user)):
    
    return {'message': current_user.email}


@router.post('/forgot-password', status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'no-store'
    normalized_email = str(payload.email).strip().lower()

    try:
        allowed, retry_after = redis_client.check_password_reset_rate_limit(
            normalized_email,
            settings.PASSWORD_RESET_REQUEST_LIMIT,
            settings.PASSWORD_RESET_RATE_WINDOW_SECONDS,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Password recovery is temporarily unavailable. Please try again.",
            headers={"Cache-Control": "no-store"},
        ) from exc

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many password reset requests. Please try again later.",
            headers={"Retry-After": str(retry_after), "Cache-Control": "no-store"},
        )

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if user and user.is_active and user.email_verified:
        token = secrets.token_urlsafe(32)
        try:
            redis_client.store_password_reset_token(
                token,
                user.id,
                user.auth_version,
                settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail="Password recovery is temporarily unavailable. Please try again.",
                headers={"Cache-Control": "no-store"},
            ) from exc
        background_tasks.add_task(send_password_reset_email, user.email, token)

    return {"message": FORGOT_PASSWORD_MESSAGE}


@router.post('/reset-password')
def reset_password(
    payload: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'no-store'
    invalid = HTTPException(
        status_code=400,
        detail=INVALID_RESET_MESSAGE,
        headers={"Cache-Control": "no-store"},
    )
    if not RESET_TOKEN_PATTERN.fullmatch(payload.token):
        raise invalid

    try:
        stored = redis_client.get_password_reset_token(payload.token)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Password recovery is temporarily unavailable. Please try again.",
            headers={"Cache-Control": "no-store"},
        ) from exc

    if not stored:
        raise invalid

    user = db.query(User).filter(User.id == stored["user_id"]).first()
    if (
        not user
        or not user.is_active
        or not user.email_verified
        or user.auth_version != stored["auth_version"]
    ):
        raise invalid

    new_hash = security.hash_password(payload.new_password)

    try:
        consumed = redis_client.consume_password_reset_token(payload.token)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Password recovery is temporarily unavailable. Please try again.",
            headers={"Cache-Control": "no-store"},
        ) from exc

    if consumed != stored:
        raise invalid

    try:
        updated = db.query(User).filter(
            User.id == stored["user_id"],
            User.auth_version == stored["auth_version"],
        ).update(
            {
                User.password_hash: new_hash,
                User.auth_version: User.auth_version + 1,
            },
            synchronize_session=False,
        )
        if updated != 1:
            db.rollback()
            raise invalid
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Password could not be reset. Please request a new link.",
            headers={"Cache-Control": "no-store"},
        ) from exc

    return {"message": RESET_PASSWORD_MESSAGE}
