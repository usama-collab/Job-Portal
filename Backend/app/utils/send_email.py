from app.tasks.celery_worker import celery_app
from app.core.config import settings
from app.utils.smtp import send_html_email

@celery_app.task
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
        print(f'Email sent to {to_email}')
    except Exception as e:
        print(f'SMTP error: {e}')
