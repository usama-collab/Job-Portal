from typing import Optional
from fastapi import HTTPException
from sqlalchemy import String, asc, cast, desc
from sqlalchemy.orm import Session
from app.core.redis_client import redis_client
from app.schemas.job import JobCreate,JobUpdate
from app.models.job import Job
import json


def create_job(job_create: JobCreate, owner_id: int, db: Session):
    payload = job_create.model_dump()
    user = Job(**payload, owner_id=owner_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# def get_jobs(db: Session):
#     jobs = db.query(Job).all()
#     return jobs
def get_jobs(db: Session, skip: int, limit: int, q: Optional[str] = None, sort_by: str = 'created_at', order: str = 'desc'):
    cache_key = f'jobs:{skip}:{limit}:{q or None}:{sort_by}:{order}'

    cached_jobs = redis_client.get(cache_key)
    if cached_jobs:
        print("Jobs Fetched from Redis cache")
        return json.loads(cached_jobs)

    query = db.query(Job).filter(Job.is_active == True)

    if q:
        like = f'%{q}%'
        query = query.filter(
            (Job.title.ilike(like)) |
            (Job.description.ilike(like)) |
            (cast(Job.created_at, String).ilike(like)) |
            (Job.company.ilike(like))
        )
    
    sortable_field = {
        "title": Job.title,
        "created_at": Job.created_at,
        "company": Job.company
    }
    sort_field = sortable_field.get(sort_by, Job.created_at)

    if order == "asc":
        query = query.order_by(asc(sort_field))
    else:
        query = query.order_by(desc(sort_field))

    jobs = query.offset(skip).limit(limit).all()
    
    # Handle empty results gracefully and cache them to avoid repeated database queries
    if not jobs:
        jobs_data = []
        # Cache an empty list to prevent repeated DB lookups for non-existent searches
        redis_client.setex(cache_key, 60, json.dumps(jobs_data))
        return jobs_data

    jobs_data = [job.as_dict() for job in jobs]
    redis_client.setex(cache_key, 60, json.dumps(jobs_data))

    return jobs_data



def get_job_by_id(job_id: int, db: Session):
    return db.query(Job).filter(Job.id == job_id).first()


def update_job(updated_job:JobUpdate, job_id:int, owner_id: int ,db: Session):
    job = get_job_by_id(job_id,db)
    if not job:
        return None
    
    data = updated_job.model_dump(exclude_none=True)
    for key,value in data.items():
        setattr(job,key,value)

    db.add(job)
    db.commit()
    db.refresh(job)

    with redis_client.pipeline() as pipe:
        for key in redis_client.scan_iter("jobs:*"):
            pipe.delete(key)
        pipe.execute()
        
    return job

    
    


def delete_job(job_id:int,db:Session):
    job = get_job_by_id(job_id, db)
    if job:
        db.delete(job)
        db.commit()
    return job


def get_jobs_for_employer(owner_id: int, db: Session):
    return (
        db.query(Job)
        .filter(Job.owner_id == owner_id)
        .order_by(Job.created_at.desc())
        .all()
    )