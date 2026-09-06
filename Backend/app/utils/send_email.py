import logging
from urllib.parse import urlencode

from app.core.config import settings
from app.utils.brevo import EmailDeliveryError, send_html_email
from app.utils.email_template import render_email


logger = logging.getLogger(__name__)


def send_confirmation_email(to_email: str, token: str):
    link = f'{settings.BACKEND_PUBLIC_URL.rstrip("/")}/auth/confirm?{urlencode({"token": token})}'
    html, text = render_email(
        title="Verify your email address",
        message="Welcome to Jobify! Confirm your email address to start exploring opportunities and applying for your next role.",
        action_label="Verify email address",
        action_url=link,
        notes=(
            f"This link expires in {settings.CONFIRMATION_TOKEN_EXPIRE_MINUTES} minutes.",
            "If you did not create a Jobify account, you can safely ignore this email.",
        ),
    )
    try:
        send_html_email(to_email, "Verify your Jobify email address", html, text)
    except EmailDeliveryError:
        logger.warning("Confirmation email delivery failed")


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f'{settings.FRONTEND_ORIGIN.rstrip("/")}/reset-password#token={token}'
    html, text = render_email(
        title="Reset your password",
        message="We received a request to reset your Jobify password.",
        action_label="Reset password",
        action_url=link,
        notes=(
            f"This link expires in {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes and can only be used once.",
            "If you did not request this email, you can safely ignore it. Your password has not changed.",
        ),
    )
    try:
        send_html_email(to_email, "Reset your Jobify password", html, text)
    except EmailDeliveryError:
        logger.warning("Password reset email delivery failed")
