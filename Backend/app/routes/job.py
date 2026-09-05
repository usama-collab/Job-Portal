from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User
from app.schemas.job import JobCreate, JobOut, JobUpdate
from app.utils.functions import can_manage_company, get_current_user, require_company_owner
from app.models.company import CompanyMembership
from app.crud import job as crud_job


router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Create Job
@router.post('/create', response_model=JobOut)
def create(
    job: JobCreate,
    membership: CompanyMembership = Depends(require_company_owner),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud_job.create_job(job, membership.company_id, current_user.id, db)

# Get Jobs for employer
@router.get("/me", response_model=List[JobOut])
def get_my_jobs(
    membership: CompanyMembership = Depends(require_company_owner),
    db: Session = Depends(get_db)
):
    jobs = crud_job.get_jobs_for_company(membership.company_id, db)
    return jobs

# Get single Job by id
@router.get('/{job_id}', response_model=JobOut)
def get_job_by_id(job_id:int, db: Session = Depends(get_db)):
    job = crud_job.get_job_by_id(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job

# Get all Jobs
@router.get('/',response_model=list[JobOut])
def get_all_jobs(
    db: Session = Depends(get_db),
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: Optional[str] = None,
    ):
    return crud_job.get_jobs(db,skip, limit, q, sort_by, order)



# Update Job
@router.put('/update/{job_id}', response_model=JobOut)
def update(updated_job: JobUpdate, job_id:int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = crud_job.get_job_by_id(job_id, db)
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    if not can_manage_company(current_user, existing.company_id, db):
        raise HTTPException(status_code=403, detail="You are not authorized to update this job")
    updated = crud_job.update_job(updated_job, job_id, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found")
    return updated

# Delete a job
@router.delete('/{job_id}')
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = crud_job.get_job_by_id(job_id, db)
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    if not can_manage_company(current_user, existing.company_id, db):
        raise HTTPException(status_code=403, detail="You are not authorized to delete this job")
    job = crud_job.delete_job(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JSONResponse(status_code=200,content="Job deleted successfully")
