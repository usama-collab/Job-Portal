from fastapi import Depends,HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core import security
from app.crud import user as crud_user
from jose import JWTError


oauth2_schemes = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Get Current User
def get_current_user(token: str = Depends(oauth2_schemes), db: Session = Depends(get_db)):
    try:
        payload = security.verify_access_token(token)
        email = payload.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Invalid Token")
        
        user = crud_user.get_user_by_email(email,db)
        if not user:
            raise HTTPException(status_code=400, detail="User Not found")
        
        return user
    
    except JWTError:
        raise HTTPException(status_code=401, detail='Token Has Expired!')
