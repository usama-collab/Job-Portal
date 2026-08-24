from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core import security
from app.models.user import User
from jose import JWTError


oauth2_schemes = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Get Current User
def get_current_user(token: str = Depends(oauth2_schemes), db: Session = Depends(get_db)):
    try:
        payload = security.verify_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail='Invalid authentication credentials',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    subject = payload.get('sub')
    if not isinstance(subject, str) or not subject.isdigit():
        raise HTTPException(
            status_code=401,
            detail='Invalid authentication credentials',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    user = db.query(User).filter(User.id == int(subject)).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail='Invalid authentication credentials',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    if not user.is_active or not user.email_verified:
        raise HTTPException(status_code=403, detail='User account is not available')

    return user


def require_roles(*allowed_roles: str):
    def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail='Insufficient permissions')
        return current_user

    return role_dependency
