from typing import Optional
from sqlalchemy.orm import Session
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import Response
from pathlib import Path
import mimetypes
from app.utils.send_app_status_email import send_app_status_email
from app.models.job import Job
from app.utils.files import (
    StorageError,
    StorageObjectNotFound,
    StorageNotConfigured,
    delete_object,
    download_object,
    is_storage_key,
    save_resume_file,
)
from app.utils.send_app_email import send_app_email
from app.core.db import get_db
from app.models.user import User, UserRole
from app.schemas.application import ApplicationOut, ApplicationUpdateStatus
from app.utils.functions import get_current_user
from app.crud import application as crud_app
from app.crud import job as crud_job



router = APIRouter(prefix="/applications", tags=["Applications"])


def _application_response(application) -> dict:
    """Expose an authorized endpoint, never the private R2 object key."""

    response = ApplicationOut.model_validate(application).model_dump()
    response["resume_path"] = (
        f"/applications/{application.id}/resume"
        if is_storage_key(application.resume_path, "resumes")
        else None
    )
    return response


def _download_filename(filename: Optional[str]) -> str:
    safe_name = Path((filename or "resume").replace("\\", "/")).name
    safe_name = safe_name.replace('"', "").replace("\r", "").replace("\n", "")
    return safe_name or "resume"

# Apply for the Job
@router.post('/jobs/{job_id}/apply', response_model=ApplicationOut)
async def apply_to_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    cover_letter: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
    ):
    if current_user.role != UserRole.SEEKER.value:
        raise HTTPException(status_code=403, detail="Only job seekers can apply for this job")
    
    resume_path = None
    resume_filename = None
    if resume:
        saved_path, original_name = await save_resume_file(resume)
        resume_path = saved_path
        resume_filename = original_name

    try:
        app = crud_app.create_application(
            job_id,
            current_user.id,
            cover_letter,
            resume_path,
            resume_filename,
            db,
        )
    except Exception:
        if resume_path:
            try:
                await delete_object(resume_path)
            except StorageError:
                pass
        raise

    # fetching the job i am applying only to get the name of the job to show in email
    job = db.query(Job).filter(Job.id == job_id).first()

    background_tasks.add_task(send_app_email, current_user.email, job.title)

    return _application_response(app)


# list applications for the specific job
@router.get('/jobs/{job_id}', response_model=list[ApplicationOut])
def get_applications_for_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if current_user.role == UserRole.ADMIN.value:
        pass
    elif current_user.role != UserRole.EMPLOYER.value or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are unauthorized to view applications for this job!")
    
    apps = crud_app.get_applications_for_job(job_id, db)

    return [_application_response(app) for app in apps]


# list all my Job Applications
@router.get('/me', response_model=list[ApplicationOut])
def get_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    apps = crud_app.get_applications_for_user(current_user.id, db)

    return [_application_response(app) for app in apps]


@router.get('/{application_id}/resume', response_class=Response)
async def download_application_resume(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = crud_app.get_application_by_id(application_id, db)
    if not application or not is_storage_key(application.resume_path, "resumes"):
        raise HTTPException(status_code=404, detail="Resume not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Resume not found")

    is_applicant = application.user_id == current_user.id
    is_job_owner = (
        current_user.role == UserRole.EMPLOYER.value
        and job.owner_id == current_user.id
    )
    is_admin = current_user.role == UserRole.ADMIN.value
    if not (is_applicant or is_job_owner or is_admin):
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        content, stored_content_type = await download_object(application.resume_path)
    except StorageObjectNotFound as exc:
        raise HTTPException(status_code=404, detail="Resume not found") from exc
    except StorageNotConfigured as exc:
        raise HTTPException(status_code=503, detail="File storage is not configured") from exc
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="File storage is unavailable") from exc

    media_type = stored_content_type or mimetypes.guess_type(application.resume_filename or "")[0]
    return Response(
        content=content,
        media_type=media_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{_download_filename(application.resume_filename)}"'
        },
    )


# Update the status of Applications (Done by admin/employer)
@router.put('/{application_id}/status', response_model=ApplicationOut)
def update_application_status(
    application_id: int,
    new_status: ApplicationUpdateStatus,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    app = crud_app.get_application_by_id(application_id, db)
    if not app:
        raise HTTPException(status_code=404, detail="Application Not Found")
    
    job = db.query(Job).filter(Job.id == app.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Application Not Found")

    if current_user.role not in {UserRole.EMPLOYER.value, UserRole.ADMIN.value}:
        raise HTTPException(status_code=403, detail="You are unauthorized to update this application")

    if current_user.role == UserRole.EMPLOYER.value and job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are unauthorized to update this application")
    
    allowed_status = {'applied', 'under_review', 'shortlisted', 'hired', 'rejected'}
    if new_status.status not in allowed_status:
        raise HTTPException(status_code=400, detail=f'invalid status, Allowed status: {allowed_status}')
    
    updated_status = crud_app.update_application_status(application_id, new_status.status, db)

    app_user = db.query(User).filter(User.id == app.user_id).first()

    background_tasks.add_task(send_app_status_email, app_user.email, new_status.status)

    return _application_response(updated_status)
