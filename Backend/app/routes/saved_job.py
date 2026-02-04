from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User
from app.utils.functions import get_current_user
from app.crud import saved_job as crud_saved
from app.schemas.saved_job import SavedJobOut

router = APIRouter(prefix="/saved-jobs", tags=["Saved Jobs"])

@router.post("/{job_id}")
def toggle_save(
    job_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "seeker":
        raise HTTPException(status_code=403, detail="Only seekers can save jobs")
    return crud_saved.toggle_save_job(db, current_user.id, job_id)

@router.get("/", response_model=List[SavedJobOut])
def get_my_saved_jobs(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return crud_saved.get_saved_jobs_for_user(db, current_user.id)