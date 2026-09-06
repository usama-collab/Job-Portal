import logging

from app.core.config import settings
from app.utils.brevo import EmailDeliveryError, send_html_email
from app.utils.email_template import render_email


logger = logging.getLogger(__name__)


def send_app_email(to_email: str, job_title: str):
    html, text = render_email(
        title="Application submitted",
        message=f'Your application for “{job_title}” has been submitted successfully. Thank you for taking your next career step with Jobify.',
        action_label="View my applications",
        action_url=f'{settings.FRONTEND_ORIGIN.rstrip("/")}/applications',
        notes=("You can track your application’s progress from My Applications. We’ll email you when its status changes.",),
    )
    try:
        send_html_email(to_email, "Your Jobify application has been submitted", html, text)
    except EmailDeliveryError:
        logger.warning("Application email delivery failed")
