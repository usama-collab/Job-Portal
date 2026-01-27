from app.tasks.celery_worker import celery_app
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.core.config import settings

@celery_app.task
def send_app_email(to_email: str, job_title: str):
    # link = f'http://localhost:8000/auth/confirm?token={token}'
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to MyApp!</h2>
        <p style="color: #555;">You have just applied for the job having title {job_title}</p>
        </div>
    </body>
    </html>
    """

    message = Mail(
        from_email=settings.MAIL_FROM,
        to_emails=to_email,
        subject='Applied for Job',
        html_content=html_content

    )

    try:
        sendgrid = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sendgrid.send(message)
        print(f'Email sent to {to_email}, Status: {response.status_code}')
    except Exception as e:
        print(f'SendGrid error: {e}')