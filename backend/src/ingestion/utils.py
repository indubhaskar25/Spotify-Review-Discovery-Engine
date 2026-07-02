import hashlib
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
URL_PATTERN = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)
WHITESPACE_PATTERN = re.compile(r"\s+")


def strip_html(text: str) -> str:
    return normalize_whitespace(HTML_TAG_PATTERN.sub(" ", text))


def normalize_whitespace(text: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", text).strip()


def is_url_only(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned:
        return False
    without_urls = URL_PATTERN.sub("", cleaned).strip()
    return not without_urls


def is_emoji_only(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned:
        return False
    without_emoji = EMOJI_PATTERN.sub("", cleaned).strip()
    return not without_emoji


def normalize_rating(value: Any) -> int | None:
    if value is None:
        return None

    text = str(value).strip().lower()
    if not text or text in {"nan", "none", "null", ""}:
        return None

    try:
        rating = int(float(text))
    except (TypeError, ValueError):
        return None

    if 1 <= rating <= 5:
        return rating
    return None


def parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        if not text or text.lower() in {"nan", "none", "null"}:
            return None

        normalized = text.replace("Z", "+00:00")
        dt = None
        for parser in (
            lambda v: datetime.fromisoformat(v),
            lambda v: datetime.strptime(v, "%Y-%m-%d"),
            lambda v: datetime.strptime(v, "%Y-%m-%d %H:%M:%S"),
            lambda v: datetime.strptime(v, "%m/%d/%Y"),
        ):
            try:
                dt = parser(normalized)
                break
            except ValueError:
                continue

        if dt is None:
            try:
                import pandas as pd

                parsed = pd.to_datetime(text, utc=True, errors="coerce")
                if pd.isna(parsed):
                    return None
                dt = parsed.to_pydatetime()
            except Exception:
                return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def make_dedup_key(source: str, text: str, created_at: datetime) -> str:
    payload = f"{source}|{text.strip().lower()}|{created_at.isoformat()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def make_record_id(source: str, external_id: str | None = None, **parts: Any) -> str:
    if external_id:
        payload = f"{source}:{external_id}"
    else:
        payload = "|".join(str(parts[key]) for key in sorted(parts))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
