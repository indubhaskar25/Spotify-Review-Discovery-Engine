from __future__ import annotations

import argparse
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from config.logging import setup_logging
from config.settings import get_settings
from src.ingestion.app_store import AppStoreCollector
from src.ingestion.cleaner import ReviewCleaner
from src.ingestion.csv_loader import CSVUploader
from src.ingestion.forum import ForumCollector
from src.ingestion.normalizer import Normalizer
from src.ingestion.play_store import PlayStoreCollector
from src.ingestion.reddit import RedditCollector
from src.models.schemas import IngestionStats, ReviewRecord, ReviewSource
from src.storage.raw_store import RawStore

logger = logging.getLogger(__name__)

SOURCE_ALIASES = {
    "csv": ReviewSource.CSV,
    "play_store": ReviewSource.PLAY_STORE,
    "app_store": ReviewSource.APP_STORE,
    "reddit": ReviewSource.REDDIT,
    "forum": ReviewSource.FORUM,
}


@dataclass
class IngestionResult:
    dataset_id: str
    records: list[ReviewRecord]
    stats: IngestionStats
    parquet_path: Path


class IngestionService:
    """End-to-end ingestion: load, normalize, clean, persist."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.csv_uploader = CSVUploader()
        self.play_store = PlayStoreCollector(self.csv_uploader)
        self.app_store = AppStoreCollector(self.csv_uploader)
        self.reddit = RedditCollector(self.settings)
        self.forum = ForumCollector()
        self.normalizer = Normalizer()
        self.cleaner = ReviewCleaner()
        self.raw_store = RawStore(self.settings)

    def ingest(
        self,
        source: str | ReviewSource,
        file_path: str | Path | None = None,
        *,
        use_live: bool = False,
        use_live_reddit: bool = False,
        dataset_id: str | None = None,
        persist: bool = True,
        limit: int = 500,
    ) -> IngestionResult:
        review_source = self._resolve_source(source)
        raw_records = self._load_raw_records(
            review_source,
            file_path=file_path,
            use_live=use_live or (use_live_reddit if review_source == ReviewSource.REDDIT else False),
            limit=limit,
        )
 
        normalized = self.normalizer.normalize_many(raw_records, source=review_source)
        cleaned, stats = self.cleaner.clean(
            normalized,
            source=review_source,
            total_input=len(raw_records),
        )
        stats.dropped_invalid = len(raw_records) - len(normalized)
 
        if not cleaned:
            raise ValueError(
                f"No valid records remained after cleaning source={review_source.value}"
            )
 
        resolved_dataset_id = dataset_id or self.raw_store.generate_dataset_id(review_source.value)
        parquet_path = Path()
        if persist:
            parquet_path = self.raw_store.save(cleaned, resolved_dataset_id, stats)
 
        logger.info(
            "Ingestion complete source=%s dataset_id=%s final_count=%s",
            review_source.value,
            resolved_dataset_id,
            stats.final_count,
        )
        return IngestionResult(
            dataset_id=resolved_dataset_id,
            records=cleaned,
            stats=stats,
            parquet_path=parquet_path,
        )
 
    def ingest_upload(self, uploaded_file: Any, source: ReviewSource = ReviewSource.CSV) -> IngestionResult:
        raw_records = self.csv_uploader.load_upload(uploaded_file)
        for record in raw_records:
            record.setdefault("source", source.value)
 
        normalized = self.normalizer.normalize_many(raw_records, source=source)
        cleaned, stats = self.cleaner.clean(
            normalized,
            source=source,
            total_input=len(raw_records),
        )
        stats.dropped_invalid = len(raw_records) - len(normalized)
 
        if not cleaned:
            raise ValueError("Uploaded CSV produced no valid records after cleaning")
 
        dataset_id = self.raw_store.generate_dataset_id(source.value)
        parquet_path = self.raw_store.save(cleaned, dataset_id, stats)
        return IngestionResult(
            dataset_id=dataset_id,
            records=cleaned,
            stats=stats,
            parquet_path=parquet_path,
        )
 
    def _resolve_source(self, source: str | ReviewSource) -> ReviewSource:
        if isinstance(source, ReviewSource):
            return source
        key = source.strip().lower()
        if key not in SOURCE_ALIASES:
            supported = ", ".join(sorted(SOURCE_ALIASES))
            raise ValueError(f"Unsupported source '{source}'. Supported: {supported}")
        return SOURCE_ALIASES[key]
 
    def _load_raw_records(
        self,
        source: ReviewSource,
        *,
        file_path: str | Path | None,
        use_live: bool,
        limit: int,
    ) -> list[dict[str, Any]]:
        if source == ReviewSource.PLAY_STORE:
            return self.play_store.load(file_path, use_live=use_live, limit=limit)
        if source == ReviewSource.APP_STORE:
            return self.app_store.load(file_path, use_live=use_live, limit=limit)
        if source == ReviewSource.REDDIT:
            return self.reddit.load(file_path, use_live=use_live, limit=limit)
        if source == ReviewSource.FORUM:
            return self.forum.load(file_path, use_live=use_live, limit=limit)
        if source == ReviewSource.CSV:
            if not file_path:
                raise ValueError("CSV ingestion requires a file_path")
            return self.csv_uploader.load_file(file_path)
 
        raise ValueError(f"Unhandled source: {source.value}")



def run_ingest_pipeline(
    source: str,
    file_path: str | Path | None = None,
    *,
    use_live_reddit: bool = False,
    persist: bool = True,
) -> IngestionResult:
    service = IngestionService()
    return service.ingest(
        source=source,
        file_path=file_path,
        use_live_reddit=use_live_reddit,
        persist=persist,
    )


def main() -> None:
    setup_logging()
    parser = argparse.ArgumentParser(description="Run Phase 1 ingestion pipeline")
    parser.add_argument("--source", required=True, choices=sorted(SOURCE_ALIASES))
    parser.add_argument("--file", dest="file_path", default=None)
    parser.add_argument("--live-reddit", action="store_true")
    parser.add_argument("--no-persist", action="store_true")
    args = parser.parse_args()

    result = run_ingest_pipeline(
        source=args.source,
        file_path=args.file_path,
        use_live_reddit=args.live_reddit,
        persist=not args.no_persist,
    )
    print(
        f"Ingestion complete: dataset_id={result.dataset_id} "
        f"records={result.stats.final_count} path={result.parquet_path}"
    )


if __name__ == "__main__":
    main()
