import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_html_email(to_email: str, subject: str, html_content: str) -> None:
    message = EmailMessage()
    message["From"] = settings.MAIL_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content("This email requires an HTML-capable email client.")
    message.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
