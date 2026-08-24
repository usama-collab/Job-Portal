from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings


engine_options = {
    "echo": settings.SQLALCHEMY_ECHO,
    "pool_pre_ping": True,
}

# Keep a small, recycled pool for cloud PostgreSQL services while allowing
# SQLite-based isolated checks to use its default pool implementation.
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_options.update(
        {
            "pool_size": 5,
            "max_overflow": 5,
            "pool_timeout": 30,
            "pool_recycle": 1800,
        }
    )

engine = create_engine(settings.DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
