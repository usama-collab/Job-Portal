from typing import Optional
from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from app.utils.send_app_status_email import send_app_status_email
from app.models.job import Job
from app.utils.files import save_resume_file
from app.utils.send_app_email import send_app_email
from app.core.db import get_db
from app.models.user import User
from app.schemas.application import ApplicationOut, ApplicationUpdateStatus
from app.utils.functions import get_current_user
from app.crud import application as crud_app
from app.crud import job as crud_job



router = APIRouter(prefix="/applications", tags=["Applications"])

# Apply for the Job
@router.post('/jobs/{job_id}/apply', response_model=ApplicationOut)
async def apply_to_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    cover_letter: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
    ):
    if getattr(current_user, "role", "seeker") != "seeker":
        raise HTTPException(status_code=400, detail="only job seekers can apply for this job")
    
    resume_path = None
    resume_filename = None
    if resume:
        saved_path, original_name = await save_resume_file(resume)
        resume_path = saved_path
        resume_filename = original_name

    app = crud_app.create_application(job_id, current_user.id, cover_letter, resume_path, resume_filename, db)

    # fetching the job i am applying only to get the name of the job to show in email
    job = db.query(Job).filter(Job.id == job_id).first()

    send_app_email.delay(current_user.email, job.title)

    return app


# list applications for the specific job
@router.get('/jobs/{job_id}', response_model=list[ApplicationOut])
def get_applications_for_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.owner_id != current_user.id and getattr(current_user, 'role', None) != 'employer':
        raise HTTPException(status_code=403, detail="You are unauthorized to view applications for this job!")
    
    apps = crud_app.get_applications_for_job(job_id, db)

    return apps


# list all my Job Applications
@router.get('/me', response_model=list[ApplicationOut])
def get_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    apps = crud_app.get_applications_for_user(current_user.id, db)

    return apps


# Update the status of Applications (Done by admin/employer)
@router.put('/{application_id}/status', response_model=ApplicationOut)
def update_application_status(application_id: int, new_status: ApplicationUpdateStatus, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    app = crud_app.get_application_by_id(application_id, db)
    if not app:
        raise HTTPException(status_code=404, detail="Application Not Found")
    
    job = db.query(Job).filter(Job.id == app.job_id).first()
    if job.owner_id == current_user.id and getattr(current_user, 'role', None) != "admin":
        raise HTTPException(status_code=403, detail="You are unauthorized to update this application")
    
    allowed_status = {'applied', 'under_review', 'shortlisted', 'hired', 'rejected'}
    if new_status.status not in allowed_status:
        raise HTTPException(status_code=400, detail=f'invalid status, Allowed status: {allowed_status}')
    
    updated_status = crud_app.update_application_status(application_id, new_status.status, db)

    app_user = db.query(User).filter(User.id == app.user_id).first()

    send_app_status_email.delay(app_user.email, new_status.status)

    return updated_status