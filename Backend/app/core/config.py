from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    JWT_SECRET_KEY: str = Field(..., env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    REDIS_URL: str = Field(..., env="REDIS_URL")
    SENDGRID_API_KEY: str = Field(..., env="SENDGRID_API_KEY")
    MAIL_FROM: str = Field(..., env="MAIL_FROM")
    CONFIRMATION_TOKEN_EXPIRE_MINUTES: int = Field(15, env="CONFIRMATION_TOKEN_EXPIRE_MINUTES")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(15, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    GOOGLE_CLIENT_ID: str = Field(..., env='GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET: str = Field(..., env='GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI: str = Field(..., env='GOOGLE_REDIRECT_URI')
    SESSION_SECRET: str = Field(..., env='SESSION_SECRET')

    class Config:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        # This points to Backend/.env no matter where config.py is

settings = Settings()
