import time
import random
import logging

logger = logging.getLogger(__name__)

def call_groq_with_retry(client, **kwargs):
    """Call Groq API with exponential backoff on rate limits (429)."""
    max_retries = 3
    base_delay = 1.5
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(**kwargs)
        except Exception as exc:
            exc_str = str(exc).lower()
            if "429" in exc_str or "rate limit" in exc_str or "limit reached" in exc_str:
                if attempt == max_retries - 1:
                    logger.error("Groq rate limit exceeded. Max retries reached: %s", exc)
                    raise exc
                # Exponential backoff with jitter
                delay = (base_delay ** attempt) + random.uniform(1.0, 2.5)
                logger.warning("Groq rate limit exceeded (429). Retrying in %.2fs (attempt %d/%d)...", delay, attempt + 1, max_retries)
                time.sleep(delay)
            else:
                raise exc
