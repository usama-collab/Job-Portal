import logging

from app.core.config import settings
from app.utils.brevo import EmailDeliveryError, send_html_email
from app.utils.email_template import render_email


logger = logging.getLogger(__name__)


def send_app_status_email(to_email: str, status: str):
    status_label = status.replace("_", " ").replace("-", " ").capitalize()
    html, text = render_email(
        title="Your application has an update",
        message=f'Your application status is now “{status_label}”. Open My Applications to see the latest details.',
        action_label="View my applications",
        action_url=f'{settings.FRONTEND_ORIGIN.rstrip("/")}/applications',
        notes=("Thank you for using Jobify for your career journey.",),
    )
    try:
        send_html_email(to_email, "Your Jobify application status has changed", html, text)
    except EmailDeliveryError:
        logger.warning("Application-status email delivery failed")
