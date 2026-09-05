from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Depends, UploadFile
from fastapi.responses import JSONResponse, Response
import mimetypes
from app.models.user import User
from app.utils.functions import get_current_user, require_admin
from app.core.db import get_db
from app.core.security import create_confirmation_token
from app.schemas.user import ProfileUpdate, UserCreate,UserOut, UserUpdate
from app.models.company import CompanyMembership
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from app.utils.send_email import send_confirmation_email
from app.utils.files import (
    StorageError,
    StorageObjectNotFound,
    StorageNotConfigured,
    delete_object,
    download_object,
    is_storage_key,
    save_avatar_file,
)

router = APIRouter(prefix='/users', tags=["Users"])


def _set_asset_urls(user: User, db: Session | None = None) -> User:
    """Expose backend asset endpoints, never private R2 object keys."""

    user.avatar_url = (
        f"/users/{user.id}/avatar"
        if is_storage_key(user.avatar_path, "avatars")
        else None
    )
    user.company_membership = None
    if db is not None:
        membership = db.query(CompanyMembership).filter(CompanyMembership.user_id == user.id).first()
        if membership:
            user.company_membership = {
                "company_id": membership.company_id,
                "role": membership.role,
                "company_name": membership.company.name,
            }
    return user


async def _serve_public_asset(user_id: int, asset: str, db: Session) -> Response:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset == "avatar":
        object_key = user.avatar_path
        prefix = "avatars"
        filename = user.avatar_filename
    else:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not is_storage_key(object_key, prefix):
        raise HTTPException(status_code=404, detail="Asset not found")

    try:
        content, stored_content_type = await download_object(object_key)
    except StorageObjectNotFound as exc:
        raise HTTPException(status_code=404, detail="Asset not found") from exc
    except StorageNotConfigured as exc:
        raise HTTPException(status_code=503, detail="File storage is not configured") from exc
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="File storage is unavailable") from exc

    media_type = stored_content_type or mimetypes.guess_type(filename or "")[0]
    return Response(content=content, media_type=media_type or "application/octet-stream")


# Register User
@router.post('/register', response_model=UserOut )
def register(
    user_create: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = crud_user.create_user(user_create, db)

    token = create_confirmation_token({'email': user.email})

    background_tasks.add_task(send_confirmation_email, user.email, token)

    return user

# Get My Profile
@router.get('/profile/me', response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()

    profile = user

    return _set_asset_urls(profile, db)


@router.get('/{user_id}/avatar', response_class=Response)
async def get_avatar(user_id: int, db: Session = Depends(get_db)):
    return await _serve_public_asset(user_id, "avatar", db)


# Get all Users
@router.get('/',response_model=list[UserOut])
def read_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return crud_user.get_users(db)


# Get Single User
@router.get('/{user_id}', response_model=UserOut)
def read_single(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=404, detail="User not found")

    user = crud_user.get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _set_asset_urls(user, db)


# Updated User
@router.put('/update/{user_id}', response_model=UserOut)
def update(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = crud_user.update_user(user_id, user_update, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# Delete User
@router.delete('/{user_id}')
def delete(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if db.query(CompanyMembership).filter(
        CompanyMembership.user_id == user_id,
        CompanyMembership.role == "owner",
    ).first():
        raise HTTPException(status_code=409, detail="Company owners must retain their account")

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
    return _set_asset_urls(updated, db)


# Upload / update avatar
@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(avatar: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    old_path = current_user.avatar_path
    saved_path = None
    try:
        saved_path, original_name = await save_avatar_file(avatar)
        updated = crud_user.update_avatar(current_user.id, saved_path, original_name, db)
    except Exception:
        if saved_path:
            try:
                await delete_object(saved_path)
            except StorageError:
                pass
        raise

    if is_storage_key(old_path, "avatars") and old_path != saved_path:
        try:
            await delete_object(old_path)
        except StorageError:
            pass

    return _set_asset_urls(updated, db)
