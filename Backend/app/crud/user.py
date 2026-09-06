from sqlalchemy.orm import Session
from app.schemas.user import ProfileUpdate, UserCreate,UserUpdate
from app.models.user import User
from app.core.security import hash_password
from fastapi import HTTPException


# Create User
def create_user(user_create: UserCreate,db: Session):
    existing = db.query(User).filter(User.email == user_create.email).first()
    if existing:
        raise HTTPException(status_code=400, detail='Email already exists')

    user = User(
        name=user_create.name,
        email=user_create.email,
        password_hash=hash_password(user_create.password),
        )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Read single user
def get_user_by_id(user_id:int,db: Session):
    return db.query(User).filter(User.id == user_id).first()

# Read Users
def get_users(db: Session):
    return db.query(User).all()

# Update User
def update_user(user_id: int, user_update:UserUpdate, db:Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    data = user_update.model_dump(exclude_none=True)
    if 'name' in data:
        user.name = data['name']
    if 'password' in data:
        user.password_hash = hash_password(data['password'])
        user.auth_version += 1

    db.commit()
    db.refresh(user)
    return user

# Delete User
def delete_user(user_id:int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    db.delete(user)
    db.commit()
    return user

# Get User By Email
def get_user_by_email(email: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User With that email not found")
    
    return user

# Verify User Email
def verify_user_email(user: User, db: Session):
    user.email_verified = True
    db.commit()
    db.refresh(user)
    return user

# Code to update the profile and images starts here

# Update Profile
def update_profile(user_id: int, payload: dict, db: Session):

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found!")
    
    for key, value in payload.items():
        setattr(user, key, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Update Avatar
def update_avatar(user_id: int, avatar_path: str, avatar_filename: str, db: Session):

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found!")
    
    user.avatar_path = avatar_path
    user.avatar_filename = avatar_filename

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
