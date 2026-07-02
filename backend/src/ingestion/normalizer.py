from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from src.ingestion.utils import make_record_id, normalize_rating, parse_datetime
from src.models.schemas import ReviewRecord, ReviewSource

logger = logging.getLogger(__name__)


class NormalizationError(ValueError):
    """Raised when a raw record cannot be mapped to ReviewRecord."""


class Normalizer:
    """Map source-specific raw records into the canonical ReviewRecord schema."""

    def normalize_many(
        self,
        records: list[dict[str, Any]],
        source: ReviewSource,
    ) -> list[ReviewRecord]:
        normalized: list[ReviewRecord] = []
        for index, record in enumerate(records):
            try:
                normalized.append(self.normalize(record, source=source))
            except NormalizationError as exc:
                logger.warning("Skipping record %s from %s: %s", index, source.value, exc)
        return normalized

    def normalize(self, record: dict[str, Any], source: ReviewSource) -> ReviewRecord:
        mapper = {
            ReviewSource.PLAY_STORE: self._from_play_store,
            ReviewSource.APP_STORE: self._from_app_store,
            ReviewSource.REDDIT: self._from_reddit,
            ReviewSource.FORUM: self._from_forum,
            ReviewSource.CSV: self._from_csv,
        }
        return mapper[source](record)

    def _from_play_store(self, record: dict[str, Any]) -> ReviewRecord:
        return self._build_record(
            source=ReviewSource.PLAY_STORE,
            record=record,
            text=self._text(record, "review_text", "text", "content"),
            external_id=self._optional_str(record, "review_id", "id"),
            rating=normalize_rating(record.get("rating")),
            author=self._optional_str(record, "author", "user"),
            created_at=self._required_date(record, "review_date", "date", "created_at"),
            title=self._optional_str(record, "title"),
            url=self._optional_str(record, "url"),
            metadata={
                "platform": self._optional_str(record, "platform"),
                "app_version": self._optional_str(record, "app_version", "version"),
            },
        )

    def _from_app_store(self, record: dict[str, Any]) -> ReviewRecord:
        text = self._text(record, "content", "review_text", "text", "body")
        title = self._optional_str(record, "title")
        combined = f"{title}. {text}" if title else text

        return self._build_record(
            source=ReviewSource.APP_STORE,
            record=record,
            text=combined,
            external_id=self._optional_str(record, "id", "review_id"),
            rating=normalize_rating(record.get("rating")),
            author=self._optional_str(record, "userName", "author", "user"),
            created_at=self._required_date(record, "date", "review_date", "created_at"),
            title=title,
            url=self._optional_str(record, "url"),
            metadata={
                "platform": self._optional_str(record, "platform") or "ios",
                "app_version": self._optional_str(record, "app_version", "version"),
            },
        )

    def _from_reddit(self, record: dict[str, Any]) -> ReviewRecord:
        title = self._optional_str(record, "title")
        body = self._optional_str(record, "body", "text", "selftext") or ""
        text = f"{title}. {body}".strip(". ") if title and body else (title or body)

        return self._build_record(
            source=ReviewSource.REDDIT,
            record=record,
            text=text,
            external_id=self._optional_str(record, "id", "post_id"),
            rating=None,
            author=self._optional_str(record, "author", "username"),
            created_at=self._required_date(record, "created_utc", "created_at", "date"),
            title=title,
            url=self._optional_str(record, "url", "permalink"),
            metadata={
                "subreddit": self._optional_str(record, "subreddit"),
                "score": record.get("score"),
                "num_comments": record.get("num_comments"),
            },
        )

    def _from_forum(self, record: dict[str, Any]) -> ReviewRecord:
        title = self._optional_str(record, "title", "subject")
        body = self._text(record, "body", "content", "text", "post_text")
        text = f"{title}. {body}".strip(". ") if title else body

        metadata = {
            "category": self._optional_str(record, "category"),
            "reply_count": record.get("reply_count"),
        }
        # Ensure metadata always has at least one field for Parquet compatibility
        if not any(v is not None and v != "" for v in metadata.values()):
            metadata["source_url"] = self._optional_str(record, "url", "permalink") or ""

        return self._build_record(
            source=ReviewSource.FORUM,
            record=record,
            text=text,
            external_id=self._optional_str(record, "post_id", "id"),
            rating=None,
            author=self._optional_str(record, "author", "username"),
            created_at=self._required_date(record, "created_at", "date", "posted_at"),
            title=title,
            url=self._optional_str(record, "url", "permalink"),
            metadata=metadata,
        )

    def _from_csv(self, record: dict[str, Any]) -> ReviewRecord:
        explicit_source = self._optional_str(record, "source")
        if explicit_source:
            try:
                mapped_source = ReviewSource(explicit_source.lower())
                return self.normalize(record, source=mapped_source)
            except ValueError:
                pass

        return self._from_play_store(record)

    def _build_record(
        self,
        source: ReviewSource,
        record: dict[str, Any],
        text: str,
        external_id: str | None,
        rating: int | None,
        author: str | None,
        created_at: datetime,
        title: str | None,
        url: str | None,
        metadata: dict[str, Any],
    ) -> ReviewRecord:
        cleaned_metadata = {
            key: value for key, value in metadata.items() if value not in (None, "", "nan")
        }

        record_id = make_record_id(source.value, external_id=external_id, text=text, created_at=created_at)

        try:
            return ReviewRecord(
                id=record_id,
                source=source,
                text=text,
                title=title,
                rating=rating,
                author=author,
                created_at=created_at,
                url=url,
                metadata=cleaned_metadata,
            )
        except ValidationError as exc:
            raise NormalizationError(str(exc)) from exc

    def _text(self, record: dict[str, Any], *keys: str) -> str:
        for key in keys:
            value = record.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
        raise NormalizationError(f"Missing review text; tried keys: {', '.join(keys)}")

    def _optional_str(self, record: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = record.get(key)
            if value is not None and str(value).strip() and str(value).lower() != "nan":
                return str(value).strip()
        return None

    def _required_date(self, record: dict[str, Any], *keys: str) -> datetime:
        for key in keys:
            if key in record and record.get(key) not in (None, "", "nan"):
                parsed = parse_datetime(record.get(key))
                if parsed is not None:
                    return parsed
        return datetime.now(timezone.utc)
