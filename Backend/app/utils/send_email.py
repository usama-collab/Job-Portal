import logging

from app.core.config import settings
from app.utils.brevo import EmailDeliveryError, send_html_email


logger = logging.getLogger(__name__)

def send_confirmation_email(to_email: str, token: str):
    link = f'{settings.BACKEND_PUBLIC_URL.rstrip("/")}/auth/confirm?token={token}'
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to MyApp!</h2>
        <p style="color: #555;">Thank you for registering. Please confirm your email address by clicking the button below:</p>
        <a href="{link}" 
            style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Confirm Email
        </a>
        <p style="color: #999; font-size: 12px;">If you did not sign up, please ignore this email.</p>
        </div>
    </body>
    </html>
    """

    try:
        send_html_email(to_email, 'Confirm Your Email', html_content)
    except EmailDeliveryError:
        logger.exception("Confirmation email delivery failed")


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f'{settings.FRONTEND_ORIGIN.rstrip("/")}/reset-password#token={token}'
    expiry = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    html_content = f"""
    <html>
    <body style="margin:0; font-family:Arial,sans-serif; background:#f4f7fb; padding:24px; color:#0f172a;">
      <div style="max-width:600px; margin:auto; background:#fff; padding:32px; border-radius:18px; border:1px solid #e2e8f0;">
        <div style="font-size:24px; font-weight:800; color:#2563eb;">Jobify.</div>
        <h2 style="margin:24px 0 12px; color:#0f172a;">Reset your password</h2>
        <p style="color:#475569; line-height:1.6;">We received a request to reset your Jobify password.</p>
        <a href="{link}" style="display:inline-block; margin:12px 0 20px; padding:12px 20px; background:#2563eb; color:#fff; text-decoration:none; border-radius:10px; font-weight:700;">Reset password</a>
        <p style="color:#64748b; line-height:1.6; font-size:14px;">This link expires in {expiry} minutes and can only be used once.</p>
        <p style="color:#64748b; line-height:1.6; font-size:14px;">If you did not request this email, you can safely ignore it. Your password has not changed.</p>
      </div>
    </body>
    </html>
    """
    text_content = (
        "Reset your Jobify password\n\n"
        f"Open this link to choose a new password: {link}\n\n"
        f"This link expires in {expiry} minutes and can only be used once. "
        "If you did not request this email, ignore it; your password has not changed."
    )

    try:
        send_html_email(
            to_email,
            "Reset your Jobify password",
            html_content,
            text_content,
        )
    except EmailDeliveryError:
        # Deliberately omit recipient and token from logs.
        logger.exception("Password reset email delivery failed")
