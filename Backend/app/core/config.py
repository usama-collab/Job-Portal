from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    BACKEND_PUBLIC_URL: str = Field("http://localhost:8000", env="BACKEND_PUBLIC_URL")
    FRONTEND_ORIGIN: str = Field("http://localhost:5173", env="FRONTEND_ORIGIN")
    APP_ENV: str = Field("development", env="APP_ENV")
    SESSION_COOKIE_SECURE: bool = Field(False, env="SESSION_COOKIE_SECURE")
    SQLALCHEMY_ECHO: bool = Field(False, env="SQLALCHEMY_ECHO")
    JWT_SECRET_KEY: str = Field(..., env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    REDIS_URL: str = Field(..., env="REDIS_URL")
    R2_ENDPOINT_URL: str | None = Field(None, env="R2_ENDPOINT_URL")
    R2_ACCESS_KEY_ID: str | None = Field(None, env="R2_ACCESS_KEY_ID")
    R2_SECRET_ACCESS_KEY: str | None = Field(None, env="R2_SECRET_ACCESS_KEY")
    R2_BUCKET_NAME: str | None = Field(None, env="R2_BUCKET_NAME")
    BREVO_API_KEY: str | None = Field(None, env="BREVO_API_KEY")
    MAIL_FROM: str = Field(..., env="MAIL_FROM")
    CONFIRMATION_TOKEN_EXPIRE_MINUTES: int = Field(15, env="CONFIRMATION_TOKEN_EXPIRE_MINUTES")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(15, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(15, env="PASSWORD_RESET_TOKEN_EXPIRE_MINUTES")
    PASSWORD_RESET_REQUEST_LIMIT: int = Field(3, env="PASSWORD_RESET_REQUEST_LIMIT")
    PASSWORD_RESET_RATE_WINDOW_SECONDS: int = Field(3600, env="PASSWORD_RESET_RATE_WINDOW_SECONDS")
    GOOGLE_CLIENT_ID: str = Field(..., env='GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET: str = Field(..., env='GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI: str = Field(..., env='GOOGLE_REDIRECT_URI')
    SESSION_SECRET: str = Field(..., env='SESSION_SECRET')

    class Config:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        # This points to Backend/app/.env for local development.

    @property
    def session_cookie_secure(self) -> bool:
        return self.APP_ENV.lower() in {"production", "prod"} or self.SESSION_COOKIE_SECURE

settings = Settings()
