from __future__ import annotations
 
import logging
import ssl
import urllib.request
import json
from pathlib import Path
from typing import Any
 
import pandas as pd
from src.ingestion.csv_loader import CSVUploader
from src.models.schemas import ReviewSource
 
logger = logging.getLogger(__name__)
 
DEFAULT_SAMPLE_PATH = Path("data/sample/app_store_sample.csv")
 
 
class AppStoreCollector:
    """Load Apple App Store review exports or fetch them live via iTunes RSS."""
 
    EXPECTED_COLUMNS = ("id", "rating", "title", "content", "userName", "date")
 
    def __init__(self, csv_uploader: CSVUploader | None = None) -> None:
        self.csv_uploader = csv_uploader or CSVUploader()
 
    def fetch_live(self, app_id: str = "324684580", limit: int = 500) -> list[dict[str, Any]]:
        logger.info("Fetching live App Store reviews for app_id=%s limit=%s", app_id, limit)
        context = ssl._create_unverified_context()
        
        raw_entries: list[dict[str, Any]] = []
        mapped_records: list[dict[str, Any]] = []
 
        # Each page returns 50 reviews, so we need up to 10 pages for 500 reviews
        pages_needed = (limit + 49) // 50
        for page in range(1, pages_needed + 1):
            url = f"https://itunes.apple.com/us/rss/customerreviews/page={page}/id={app_id}/sortBy=mostRecent/json"
            try:
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "SpotifyReviewDiscovery/1.0"}
                )
                with urllib.request.urlopen(req, context=context) as response:
                    raw_body = response.read().decode("utf-8")
                    data = json.loads(raw_body)
                    feed = data.get("feed", {})
                    
                    if "entry" not in feed:
                        logger.warning(
                            "App Store response contained metadata only (no review entries).\n"
                            "URL: %s\nHTTP status code: %s\nFirst 300 characters of the response body: %s",
                            url, response.getcode(), raw_body[:300]
                        )
                        break

                    entries = feed.get("entry", [])
                    if not entries:
                        logger.info("No more reviews found on page %s. Stopping.", page)
                        break
 
                    # If page 1 has only 1 entry or is app details, handle list/dict variations
                    if isinstance(entries, dict):
                        entries = [entries]
 
                    for entry in entries:
                        # Skip the first item if it's the app info card and not a review
                        if "im:name" in entry:
                            continue
 
                        raw_entries.append(entry)
                        
                        # Map to canonical keys that normalizer expects
                        mapped_records.append({
                            "id": entry.get("id", {}).get("label"),
                            "author": entry.get("author", {}).get("name", {}).get("label"),
                            "title": entry.get("title", {}).get("label"),
                            "content": entry.get("content", {}).get("label"),
                            "rating": entry.get("im:rating", {}).get("label"),
                            "date": entry.get("updated", {}).get("label"),
                            "version": entry.get("im:version", {}).get("label"),
                            "source": ReviewSource.APP_STORE.value
                        })
 
                        if len(mapped_records) >= limit:
                            break
            except Exception as e:
                logger.error("Error fetching App Store page %s: %s", page, e)
                break
 
            if len(mapped_records) >= limit:
                break
 
        # Save raw data to raw storage
        if raw_entries:
            # Flatten slightly for CSV serialization
            flattened = []
            for entry in raw_entries:
                flattened.append({
                    "id": entry.get("id", {}).get("label"),
                    "author": entry.get("author", {}).get("name", {}).get("label"),
                    "title": entry.get("title", {}).get("label"),
                    "content": entry.get("content", {}).get("label"),
                    "rating": entry.get("im:rating", {}).get("label"),
                    "updated": entry.get("updated", {}).get("label"),
                    "im:version": entry.get("im:version", {}).get("label"),
                })
            raw_df = pd.DataFrame(flattened)
            raw_path = Path("data/raw/app_store_reviews.csv")
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_df.to_csv(raw_path, index=False, encoding="utf-8")
            logger.info("Saved %s raw App Store reviews to %s", len(raw_entries), raw_path)
 
        return mapped_records[:limit]
 
    def load(
        self,
        file_path: str | Path | None = None,
        *,
        use_live: bool = False,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        if use_live:
            return self.fetch_live(limit=limit)
 
        path = Path(file_path) if file_path else Path("data/raw/app_store_reviews.csv")
        if not path.exists():
            path = DEFAULT_SAMPLE_PATH
            logger.warning("Raw App Store file not found, falling back to sample: %s", path)
 
        records = self.csv_uploader.load_file(path)
        for record in records:
            record["source"] = ReviewSource.APP_STORE.value
        logger.info("Loaded %s App Store records from %s", len(records), path)
        return records

