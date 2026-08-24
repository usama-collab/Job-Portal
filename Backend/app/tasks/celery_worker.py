import ssl

from celery import Celery
from app.core.config import settings

redis_url = settings.REDIS_URL

celery_app = Celery(
    'worker',
    broker=redis_url,
    backend=redis_url,
)

if redis_url.startswith("rediss://"):
    celery_app.conf.broker_use_ssl = {
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
    }
    celery_app.conf.redis_backend_use_ssl = {
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
    }

celery_app.conf.timezone = "Asia/Karachi"

from app.utils import send_email
from app.utils import send_app_email
from app.utils import send_app_status_email
