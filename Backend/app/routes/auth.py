from fastapi import APIRouter,Depends,HTTPException
from app.utils.functions import get_current_user
from app.core.db import get_db
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from app.core import redis_client, security
from app.models.user import User
from app.schemas.token import RefreshRequest, TokenOut
from app.core.config import settings


router = APIRouter(prefix='/auth', tags=["Auth"])



# Email Confirmation
@router.get('/confirm')
def confirm_email(token: str, db: Session = Depends(get_db)):

    payload = security.verify_confirmation_token(token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid/Expired token")
    
    email = payload.get('email')
    user = crud_user.get_user_by_email(email, db)
    
    if user.email_verified:
        return HTMLResponse(content="<h1>Email Already Verified!</h1>")
    
    crud_user.verify_user_email(user, db)
    return HTMLResponse(content="<h1>Email Verified Successfully!</h1>")


# Login
@router.post('/login', response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    user = crud_user.get_user_by_email(form_data.username,db)
    verify_password = security.verify_password(form_data.password,user.password_hash)

    if not user or not verify_password:
        raise HTTPException(status_code=400, detail="Invalid Credentials")
    
    access_token = security.create_access_token({'email': user.email})
    refresh_token = security.create_refresh_token({'email': user.email})
    
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    redis_client.redis_client.setex(f'refresh:{refresh_token}', ttl, user.email)

    return TokenOut(access_token=access_token, refresh_token=refresh_token)


# Refreshing the access token for the better user experience
@router.post('/refresh', response_model=TokenOut)
def refresh_token(payload: RefreshRequest):

    old_refresh_token = payload.refresh_token

    user = security.verify_refresh_token(old_refresh_token)
    email = user.get('email')
    if not email:
        raise HTTPException(status_code=401, detail="Invalid Refersh Token")
    
    redis_client.redis_client.get(f'refresh: {old_refresh_token}')
    
    new_access = security.create_access_token({'email': email})
    new_refresh = security.create_refresh_token({'email': email})

    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    redis_client.redis_client.setex(f'refresh: {new_refresh}', ttl, email)

    return TokenOut(access_token=new_access, refresh_token=new_refresh)


# Logout and Deleting the redis refresh token
@router.post('/logout')
def logout(payload: RefreshRequest):

    old_refresh_token = payload.refresh_token
    redis_client.redis_client.delete(f'refresh:{old_refresh_token}')
    return {'message': 'Logged Out'}
        

    
# Check token if it is valid
@router.get('/check-token')
def check_token(current_user: User = Depends(get_current_user)):
    
    return {'message': current_user.email}