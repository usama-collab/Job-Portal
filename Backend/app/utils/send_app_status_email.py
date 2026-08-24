from app.tasks.celery_worker import celery_app
from app.utils.smtp import send_html_email

@celery_app.task
def send_app_status_email(to_email: str,status: str):
    # Confirmation links should use settings.BACKEND_PUBLIC_URL if needed.
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to MyApp!</h2>
        <p style="color: #555;">Current status for your application is {status}</p>
        </div>
    </body>
    </html>
    """

    try:
        send_html_email(to_email, 'Job Application Status', html_content)
        print(f'Email sent to {to_email}')
    except Exception as e:
        print(f'SMTP error: {e}')
