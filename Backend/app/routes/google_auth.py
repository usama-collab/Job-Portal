from fastapi import APIRouter, Depends, HTTPException
from fastapi.requests import Request
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session
from app.core.security import create_access_token
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
            
        jwt_token = create_access_token({'email': user.email})
        print("Session:", request.session)

        return {'access_token': jwt_token, 'token_type': 'bearer'}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Authenication Failed with {str(e)}")