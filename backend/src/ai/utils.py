import time
import random
import logging
import os
from groq import Groq
from config.settings import get_settings

logger = logging.getLogger(__name__)

_groq_client = None
_groq_init_called = False

def get_groq_client() -> Groq | None:
    """Return the centralized singleton Groq client instance."""
    global _groq_client, _groq_init_called
    if not _groq_init_called:
        _groq_init_called = True
        settings = get_settings()
        api_key = os.environ.get("GROQ_API_KEY", "") or settings.groq_api_key
        if api_key:
            try:
                _groq_client = Groq(api_key=api_key)
                logger.info("Groq client initialized successfully (key length=%d).", len(api_key))
            except Exception as exc:
                logger.exception("Failed to initialize Groq client: %s", exc)
        else:
            logger.warning("GROQ_API_KEY not configured. Groq client initialized as None.")
    return _groq_client

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
