from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.models.job import Job
from app.models.application import Application




def create_application(
        job_id: int,
        user_id: int,
        cover_letter: Optional[str],
        resume_path: Optional[str],
        resume_filename: Optional[str],
        db: Session
        ) -> Application:
    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    existing = db.query(Application).filter(Application.job_id == job_id, Application.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")
    
    app = Application(
        job_id=job_id,
        user_id=user_id,
        cover_letter=cover_letter,
        resume_path=resume_path,
        resume_filename=resume_filename,
        status='applied'
    )

    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def get_applications_for_job(job_id: int, db: Session) -> list[Application]:
    return db.query(Application).filter(Application.job_id == job_id).order_by(Application.created_at.desc()).all()


def get_applications_for_user(user_id: int, db: Session) -> list[Application]:
    return db.query(Application).filter(Application.user_id == user_id).order_by(Application.created_at.desc()).all()


def get_application_by_id(application_id: int, db: Session) -> Optional[Application]:
    return db.query(Application).filter(Application.id == application_id).first()


def update_application_status(application_id: int, new_status: str, db: Session) -> Optional[Application]:
    app = get_application_by_id(application_id,db)
    if not app:
        return None
    app.status = new_status
    db.add(app)
    db.commit()
    db.refresh(app)
    return app