from fastapi import FastAPI
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.routes import user,auth,job,application,google_auth, saved_job




app = FastAPI(title="Job Board App")

# Allow frontend (Next.js) to talk to backend
# origins = [
#     "http://localhost:3001",   # Next.js dev server
#     "http://127.0.0.1:3001",   # Alternate
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],   # Allow all methods
    allow_headers=["*"],   # Allow all headers
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET,
    https_only=False
)

@app.get('/')
def get_home():
    return {"message": 'Job Board API with FastAPI + PostgresQL'}

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(job.router)
app.include_router(application.router)
app.include_router(google_auth.router)
app.include_router(saved_job.router)