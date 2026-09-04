from fastapi import APIRouter, Depends, HTTPException
from app.utils.functions import get_current_user
from app.core.db import get_db
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from app.core import redis_client, security
from app.models.user import User
from app.schemas.token import RefreshRequest, TokenOut
from app.core.config import settings
from jose import JWTError


router = APIRouter(prefix='/auth', tags=["Auth"])



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
    
    access_token = security.create_access_token({
        'sub': str(user.id),
        'role': user.role,
    })
    refresh_token = security.create_refresh_token({'sub': str(user.id)})
    
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

    new_access = security.create_access_token({
        'sub': str(current_user.id),
        'role': current_user.role,
    })
    new_refresh = security.create_refresh_token({'sub': str(current_user.id)})

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
