from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core import security
from app.models.user import User
from app.models.company import CompanyMembership
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

    token_version = payload.get('ver', 0)
    if type(token_version) is not int or token_version != user.auth_version:
        raise HTTPException(
            status_code=401,
            detail='Invalid authentication credentials',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    return user


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Insufficient permissions')
    return current_user


def get_company_membership(user_id: int, db: Session):
    return db.query(CompanyMembership).filter(CompanyMembership.user_id == user_id).first()


def require_company_owner(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = get_company_membership(current_user.id, db)
    if not membership or membership.role != "owner":
        raise HTTPException(status_code=403, detail="Complete employer onboarding to access recruiting features")
    return membership


def can_manage_company(user: User, company_id: int, db: Session) -> bool:
    if user.is_admin:
        return True
    return db.query(CompanyMembership).filter(
        CompanyMembership.user_id == user.id,
        CompanyMembership.company_id == company_id,
        CompanyMembership.role.in_(("owner", "manager")),
    ).first() is not None
