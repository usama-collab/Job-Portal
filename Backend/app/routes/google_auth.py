from fastapi import APIRouter, Depends, HTTPException
from fastapi.requests import Request
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session
from app.core import redis_client, security
from app.models.user import User
from app.core.db import get_db
from app.core.config import settings


router = APIRouter(prefix="/googleauth", tags=["Google Auth"])


oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"}
)


@router.get('/login')
async def google_login(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/google/callback')
async def google_callback(request: Request, db: Session = Depends(get_db)):

    try:

        token = await oauth.google.authorize_access_token(request)

        # Fetch User info via authlib
        user_info = token.get('userinfo')

        email = user_info.get('email')
        name = user_info.get('name')

        if not email:
            raise HTTPException(status_code=400, detail="Google account has no email!")
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=name,
                email=email,
                password_hash="",
                email_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if not user.is_active:
                raise HTTPException(status_code=403, detail="User account is not available")
            if not user.email_verified:
                user.email_verified = True
                db.commit()
                db.refresh(user)
            
        access_token = security.create_access_token({'sub': str(user.id)})
        refresh_token = security.create_refresh_token({'sub': str(user.id)})
        ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
        redis_client.redis_client.setex(
            redis_client.refresh_token_key(refresh_token),
            ttl,
            str(user.id),
        )

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
        }
    
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Google authentication failed")
