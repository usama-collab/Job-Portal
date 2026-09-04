from fastapi import Depends, FastAPI, HTTPException
from app.core.config import settings
from app.core.db import get_db
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.routes import user,auth,job,application,google_auth, saved_job
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from urllib.parse import urlsplit


app = FastAPI(title="Job Board App")


def get_cors_origins() -> list[str]:
    configured_origin = settings.FRONTEND_ORIGIN.rstrip("/")
    origins = {configured_origin}

    # Browsers treat localhost and 127.0.0.1 as different origins. Permit both
    # loopback forms in development while keeping production CORS explicit.
    if settings.APP_ENV.lower() in {"development", "dev", "local"}:
        parsed_origin = urlsplit(configured_origin)
        if parsed_origin.scheme in {"http", "https"}:
            port = f":{parsed_origin.port}" if parsed_origin.port else ""
            origins.update({
                f"{parsed_origin.scheme}://localhost{port}",
                f"{parsed_origin.scheme}://127.0.0.1{port}",
            })

    return sorted(origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
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
