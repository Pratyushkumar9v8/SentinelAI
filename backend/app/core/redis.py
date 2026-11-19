import logging
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("sentinel.redis")
redis_client = None

async def get_redis_client():
    global redis_client
    if redis_client is None:
        try:
            client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1.5,
                socket_timeout=1.5
            )
            await client.ping()
            redis_client = client
        except Exception as e:
            logger.debug(f"Redis not available ({e}), falling back to in-memory mode.")
            redis_client = None
    return redis_client
