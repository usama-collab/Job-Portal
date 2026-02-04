from sqlalchemy.orm import Session
from app.models.saved_job import SavedJob

def toggle_save_job(db: Session, user_id: int, job_id: int):
    # Check if already saved
    existing_save = db.query(SavedJob).filter_by(user_id=user_id, job_id=job_id).first()
    
    if existing_save:
        db.delete(existing_save)
        db.commit()
        return {"status": "unsaved"}
    
    new_save = SavedJob(user_id=user_id, job_id=job_id)
    db.add(new_save)
    db.commit()
    db.refresh(new_save)
    return {"status": "saved"}

def get_saved_jobs_for_user(db: Session, user_id: int):
    return db.query(SavedJob).filter(SavedJob.user_id == user_id).all()