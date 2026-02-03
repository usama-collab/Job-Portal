from typing import cast
from fastapi import APIRouter, File, HTTPException, Depends, UploadFile
from fastapi.responses import JSONResponse
from app.models.user import User
from app.utils.functions import get_current_user
from app.core.db import get_db
from app.core.security import create_confirmation_token
from app.schemas.user import CompanyProfileUpdate, ProfileUpdate, UserCreate,UserOut, UserUpdate
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from app.utils.send_email import send_confirmation_email
from app.utils.files import save_avatar_file,save_logo_file

router = APIRouter(prefix='/users', tags=["Users"])


# Register User
@router.post('/register', response_model=UserOut )
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    user = crud_user.create_user(user_create, db)

    token = create_confirmation_token({'email': user.email})

    send_confirmation_email.delay(user.email,token)

    return user

# Get My Profile
@router.get('/profile/me', response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()

    profile = user

    if getattr(profile, "avatar_path", None):
        profile.avatar_url = '/' + cast(str,profile.avatar_path).replace("\\", "/")
    else:
        profile.avatar_url = None

    
    if getattr(profile, "logo_path", None):
        profile.logo_url = '/' + cast(str,profile.logo_path).replace("\\", "/")

    else:
        profile.logo_url = None

    return profile


# Get all Users
@router.get('/',response_model=list[UserOut])
def read_all(db: Session = Depends(get_db)):
    return crud_user.get_users(db)


# Get Single User
@router.get('/{user_id}', response_model=UserOut)
def read_single(user_id:int, db: Session = Depends(get_db)):
    return crud_user.get_user_by_id(user_id, db)


# Updated User
@router.put('/update/{user_id}', response_model=UserOut)
def update(user_id:int ,user_update:UserUpdate, db: Session = Depends(get_db)):
    user = crud_user.update_user(user_id, user_update, db)
    if not user:
        HTTPException(status_code=200, detail="Job with that id not found")


# Delete User
@router.delete('/{user_id}')
def delete(user_id: int, db: Session = Depends(get_db)):
    user = crud_user.delete_user(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User with this id not exists")
    return JSONResponse(status_code=200, content="User deleted successfully!")


# Update Seeker Profile
@router.put('/me/update', response_model=UserOut)
def update_my_profile(payload: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    allowed = {'name', 'bio', 'skills', 'experience'}
    data = payload.model_dump(exclude_none=True)

    data = {k: v for k, v in data.items() if k in allowed}

    updated = crud_user.update_profile(current_user.id, data, db)

    # attach urls
    updated.avatar_url = "/" + cast(str,updated.avatar_path).replace("\\", "/") if updated.avatar_path else None
    updated.logo_url = "/" + cast(str,updated.logo_path).replace("\\", "/") if updated.logo_path else None

    return updated


# Upload / update avatar
@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(avatar: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    saved_path, original_name = await save_avatar_file(avatar)

    updated = crud_user.update_avatar(current_user.id, saved_path, original_name, db)

    updated.avatar_url = "/" + cast(str,updated.avatar_path).replace("\\", "/") if updated.avatar_path else None
    updated.logo_url = "/" + cast(str,updated.logo_path).replace("\\", "/") if updated.logo_path else None

    return updated

# Update company profile
@router.post('/me/company', response_model=UserOut)
def update_company_profile(payload: CompanyProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    if getattr(current_user, "role", "seeker") != "employer" and getattr(current_user, "role", None) != "admin":

        raise HTTPException(status_code=403, detail="Only employers can update profile")

    data = payload.model_dump(exclude_none=True)
    allowed = {"company_name", "company_website", "company_description"}
    data = {k: v for k, v in data.items() if k in allowed}

    updated = crud_user.update_company_profile(current_user.id, data, db)

    updated.avatar_url = "/" + cast(str,updated.avatar_path).replace("\\", "/") if updated.avatar_path else None
    updated.logo_url = "/" + cast(str,updated.avatar_path).replace("\\", "/") if updated.logo_path else None

    return updated

# Upload / update company logo (employer only)
@router.post("/me/company/logo", response_model=UserOut)
async def upload_company_logo(logo: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if getattr(current_user, "role", "seeker") != "employer" and getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Only employers can upload company logo")

    saved_path, original_name = await save_logo_file(logo)
    updated = crud_user.update_logo(db, current_user.id, saved_path, original_name)
    
    updated.avatar_url = "/" + cast(str,updated.avatar_path).replace("\\", "/") if updated.avatar_path else None
    updated.logo_url = "/" + cast(str,updated.avatar_path).replace("\\", "/") if updated.logo_path else None

    return updated