import logging

from app.utils.brevo import EmailDeliveryError, send_html_email


logger = logging.getLogger(__name__)

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
    except EmailDeliveryError:
        logger.exception("Application-status email delivery failed")
