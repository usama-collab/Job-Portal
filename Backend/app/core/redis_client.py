import redis
from app.core.config import settings

redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)


def refresh_token_key(token: str) -> str:
    return f"refresh:{token}"


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
