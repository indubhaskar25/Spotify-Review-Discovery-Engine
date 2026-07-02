from __future__ import annotations
 
import json
import logging
from pathlib import Path
from typing import Any
 
import pandas as pd
from src.ingestion.csv_loader import CSVUploader
from src.models.schemas import ReviewSource
 
logger = logging.getLogger(__name__)
 
 
class PlayStoreCollector:
    """Parse Google Play Store review exports in CSV or JSON format, or fetch live reviews."""
 
    def __init__(self, csv_uploader: CSVUploader | None = None) -> None:
        self.csv_uploader = csv_uploader or CSVUploader()
 
    def fetch_live(self, app_id: str = "com.spotify.music", limit: int = 500) -> list[dict[str, Any]]:
        from google_play_scraper import Sort, reviews
 
        logger.info("Fetching live Play Store reviews for app_id=%s limit=%s", app_id, limit)
        result, _ = reviews(
            app_id,
            lang="en",
            country="us",
            sort=Sort.NEWEST,
            count=limit,
        )
 
        # Save raw data to raw storage
        raw_df = pd.DataFrame(result)
        raw_path = Path("data/raw/play_store_reviews.csv")
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_df.to_csv(raw_path, index=False, encoding="utf-8")
        logger.info("Saved %s raw Play Store reviews to %s", len(result), raw_path)
 
        mapped_records: list[dict[str, Any]] = []
        for row in result:
            at_val = row.get("at")
            if hasattr(at_val, "isoformat"):
                at_str = at_val.isoformat()
            else:
                at_str = str(at_val) if at_val else None
 
            mapped_records.append(
                {
                    "reviewId": row.get("reviewId"),
                    "score": row.get("score"),
                    "content": row.get("content"),
                    "userName": row.get("userName"),
                    "at": at_str,
                    "platform": "android",
                    "appVersion": row.get("appVersion"),
                    "source": ReviewSource.PLAY_STORE.value,
                }
            )
        return mapped_records
 
    def load(
        self,
        file_path: str | Path | None = None,
        *,
        use_live: bool = False,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        if use_live:
            return self.fetch_live(limit=limit)
 
        path = Path(file_path) if file_path else Path("data/raw/play_store_reviews.csv")
        if not path.exists():
            # Fall back to sample if raw file doesn't exist
            from config.settings import get_settings
 
            path = get_settings().sample_data_path
            logger.warning("Raw Play Store file not found, falling back to sample: %s", path)
 
        suffix = path.suffix.lower()
        if suffix == ".json":
            return self._load_json(path)
        return self._load_csv(path)
 
    def _load_csv(self, path: Path) -> list[dict[str, Any]]:
        records = self.csv_uploader.load_file(path)
        for record in records:
            record.setdefault("source", ReviewSource.PLAY_STORE.value)
        logger.info("Loaded %s Play Store CSV records from %s", len(records), path)
        return records
 
    def _load_json(self, path: Path) -> list[dict[str, Any]]:
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("reviews", [])
        records: list[dict[str, Any]] = []
 
        for row in rows:
            records.append(
                {
                    "review_id": row.get("reviewId") or row.get("id"),
                    "rating": row.get("score") or row.get("rating"),
                    "review_text": row.get("content") or row.get("text"),
                    "author": row.get("userName") or row.get("author"),
                    "review_date": row.get("at") or row.get("date"),
                    "platform": row.get("platform", "android"),
                    "app_version": row.get("appVersion") or row.get("version"),
                    "source": ReviewSource.PLAY_STORE.value,
                }
            )
 
        logger.info("Loaded %s Play Store JSON records from %s", len(records), path)
        return records

