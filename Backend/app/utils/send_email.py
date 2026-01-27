from app.tasks.celery_worker import celery_app
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.core.config import settings

@celery_app.task
def send_confirmation_email(to_email: str, token: str):
    link = f'http://localhost:8000/auth/confirm?token={token}'
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

    message = Mail(
        from_email=settings.MAIL_FROM,
        to_emails=to_email,
        subject='Confirm Your Email',
        html_content=html_content

    )

    try:
        sendgrid = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sendgrid.send(message)
        print(f'Email sent to {to_email}, Status: {response.status_code}')
    except Exception as e:
        print(f'SendGrid error: {e}')