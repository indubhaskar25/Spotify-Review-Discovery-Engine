from __future__ import annotations

import logging

from src.ingestion.utils import (
    is_emoji_only,
    is_url_only,
    make_dedup_key,
    normalize_whitespace,
    strip_html,
)
from src.models.schemas import IngestionStats, ReviewRecord, ReviewSource

logger = logging.getLogger(__name__)

MIN_TEXT_LENGTH = 10


class ReviewCleaner:
    """Apply validation, noise filtering, and deduplication rules."""

    def clean(
        self,
        records: list[ReviewRecord],
        source: ReviewSource,
        total_input: int | None = None,
    ) -> tuple[list[ReviewRecord], IngestionStats]:
        stats = IngestionStats(
            source=source,
            total_input=total_input if total_input is not None else len(records),
            normalized=len(records),
        )

        cleaned_records: list[ReviewRecord] = []
        seen_keys: set[str] = set()

        for record in records:
            processed = self._preprocess_record(record)

            if len(processed.text) < MIN_TEXT_LENGTH:
                stats.dropped_short_text += 1
                continue

            if is_url_only(processed.text) or is_emoji_only(processed.text):
                stats.dropped_noise += 1
                continue

            dedup_key = make_dedup_key(
                processed.source.value,
                processed.text,
                processed.created_at,
            )
            if dedup_key in seen_keys:
                stats.deduplicated += 1
                continue

            seen_keys.add(dedup_key)
            cleaned_records.append(processed)

        stats.final_count = len(cleaned_records)
        logger.info(
            "Cleaned %s records: input=%s final=%s short=%s noise=%s dedup=%s",
            source.value,
            stats.total_input,
            stats.final_count,
            stats.dropped_short_text,
            stats.dropped_noise,
            stats.deduplicated,
        )
        return cleaned_records, stats

    def _preprocess_record(self, record: ReviewRecord) -> ReviewRecord:
        text = normalize_whitespace(strip_html(record.text))
        title = normalize_whitespace(strip_html(record.title)) if record.title else None

        return record.model_copy(update={"text": text, "title": title or None})
