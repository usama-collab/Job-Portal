import httpx

from app.core.config import settings


BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email"


class EmailDeliveryError(RuntimeError):
    """Raised when an email cannot be submitted to Brevo."""


def send_html_email(to_email: str, subject: str, html_content: str) -> None:
    if not settings.BREVO_API_KEY or not settings.MAIL_FROM:
        raise EmailDeliveryError("Brevo email delivery is not configured")

    payload = {
        "sender": {"email": settings.MAIL_FROM},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": "This email requires an HTML-capable email client.",
    }
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }

    try:
        response = httpx.post(
            BREVO_EMAIL_API_URL,
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise EmailDeliveryError("Brevo rejected or could not receive the email") from exc
