from fastapi import Depends, FastAPI, HTTPException
from app.core.config import settings
from app.core.db import get_db
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.routes import user,auth,job,application,google_auth, saved_job
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


app = FastAPI(title="Job Board App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],   # Allow all methods
    allow_headers=["*"],   # Allow all headers
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET,
    https_only=settings.session_cookie_secure,
    same_site="lax",
)

@app.get('/')
def get_home():
    return {"message": 'Job Board API with FastAPI + PostgresQL'}


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Report readiness only when the application can reach its database."""

    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Service unavailable") from exc

    return {"status": "ok", "database": "ok"}

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(job.router)
app.include_router(application.router)
app.include_router(google_auth.router)
app.include_router(saved_job.router)
