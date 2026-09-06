import hashlib
import json

import redis
from app.core.config import settings

redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)


def refresh_token_key(token: str) -> str:
    return f"refresh:{token}"


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def password_reset_token_key(token: str) -> str:
    return f"password-reset:token:{_digest(token)}"


def password_reset_rate_key(normalized_email: str) -> str:
    return f"password-reset:rate:{_digest(normalized_email)}"


def store_password_reset_token(token: str, user_id: int, auth_version: int, ttl: int) -> None:
    redis_client.setex(
        password_reset_token_key(token),
        ttl,
        json.dumps({"user_id": user_id, "auth_version": auth_version}, separators=(",", ":")),
    )


def get_password_reset_token(token: str) -> dict | None:
    value = redis_client.get(password_reset_token_key(token))
    if not value:
        return None
    try:
        payload = json.loads(value)
    except (TypeError, ValueError):
        return None
    if (
        not isinstance(payload, dict)
        or type(payload.get("user_id")) is not int
        or type(payload.get("auth_version")) is not int
    ):
        return None
    return payload


def consume_password_reset_token(token: str) -> dict | None:
    value = redis_client.getdel(password_reset_token_key(token))
    if not value:
        return None
    try:
        payload = json.loads(value)
    except (TypeError, ValueError):
        return None
    return payload if isinstance(payload, dict) else None


RATE_LIMIT_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
"""


def check_password_reset_rate_limit(
    normalized_email: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int]:
    count, ttl = redis_client.eval(
        RATE_LIMIT_SCRIPT,
        1,
        password_reset_rate_key(normalized_email),
        window_seconds,
    )
    return int(count) <= limit, max(int(ttl), 1)


def rotate_refresh_token(
    old_token: str,
    new_token: str,
    ttl: int,
    identity: str,
) -> bool:
    old_key = refresh_token_key(old_token)
    new_key = refresh_token_key(new_token)

    with redis_client.pipeline() as pipe:
        while True:
            try:
                pipe.watch(old_key)
                stored_identity = pipe.get(old_key)
                if stored_identity != identity:
                    pipe.unwatch()
                    return False

                pipe.multi()
                pipe.delete(old_key)
                pipe.setex(new_key, ttl, identity)
                pipe.execute()
                return True
            except redis.WatchError:
                continue
