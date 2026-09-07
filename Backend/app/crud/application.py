from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.models.job import Job
from app.models.application import Application
from app.crud.notification import notify_application_received, notify_status_changed




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

    try:
        db.add(app)
        db.flush()
        notify_application_received(app, db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return app


def get_applications_for_job(job_id: int, db: Session) -> list[Application]:
    return db.query(Application).filter(Application.job_id == job_id).order_by(Application.created_at.desc()).all()


def get_applications_for_user(user_id: int, db: Session) -> list[Application]:
    return db.query(Application).filter(Application.user_id == user_id).order_by(Application.created_at.desc()).all()


def get_application_by_id(application_id: int, db: Session) -> Optional[Application]:
    return db.query(Application).filter(Application.id == application_id).first()


def update_application_status(application_id: int, new_status: str, db: Session) -> tuple[Optional[Application], bool]:
    # Refresh an already-loaded row after acquiring the lock. Concurrent requests
    # must compare against the committed status, not their identity-map snapshot.
    app = db.query(Application).filter(Application.id == application_id).populate_existing().with_for_update().first()
    if not app:
        return None, False
    if app.status == new_status:
        db.commit()
        return app, False
    previous_status = app.status
    try:
        app.status = new_status
        notify_status_changed(app, previous_status, db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return app, True
