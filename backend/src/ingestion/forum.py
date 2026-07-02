from __future__ import annotations
 
import logging
import ssl
import urllib.request
import urllib.parse
import json
from pathlib import Path
from typing import Any
 
import pandas as pd
from src.models.schemas import ReviewSource
 
logger = logging.getLogger(__name__)
 
DEFAULT_SAMPLE_PATH = Path("data/sample/forum_sample.json")
 
 
class ForumCollector:
    """Load Spotify Community Forum posts from cached JSON or fetch live via Khoros LiQL."""
 
    def fetch_live(self, limit: int = 100, keywords: list[str] | None = None) -> list[dict[str, Any]]:
        logger.info("Fetching live Forum discussions limit=%s", limit)
        context = ssl._create_unverified_context()
        
        if keywords is None:
            keywords = [
                "recommendation",
                "discover weekly",
                "music discovery",
                "AI DJ",
                "repetitive recommendations",
            ]
 
        raw_items: list[dict[str, Any]] = []
        
        # We query for each keyword to gather a diverse set of real forum discussions
        # and deduplicate them in memory.
        for kw in keywords:
            query = f"SELECT id,subject,body,author,post_time,view_href FROM messages WHERE body MATCHES '{kw}' LIMIT {limit}"
            encoded_query = urllib.parse.quote_plus(query)
            url = f"https://community.spotify.com/api/2.0/search?q={encoded_query}"
            
            try:
                logger.info("Querying forum search for '%s'...", kw)
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                )
                with urllib.request.urlopen(req, context=context) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    items = data.get("data", {}).get("items", [])
                    logger.info("Found %s items for '%s'", len(items), kw)
                    raw_items.extend(items)
            except Exception as e:
                logger.error("Error querying forum API for '%s': %s", kw, e)
 
        # Deduplicate items by message id
        seen = set()
        unique_items = []
        for item in raw_items:
            mid = item.get("id")
            if mid and mid not in seen:
                seen.add(mid)
                unique_items.append(item)
 
        # Map to raw fields suitable for CSV serialization and normalization
        mapped_records: list[dict[str, Any]] = []
        for item in unique_items:
            author_val = item.get("author")
            author_name = None
            if isinstance(author_val, dict):
                author_name = author_val.get("login")
            elif author_val:
                author_name = str(author_val)
 
            mapped_records.append({
                "post_id": item.get("id"),
                "title": item.get("subject"),
                "body": item.get("body"),
                "author": author_name,
                "created_at": item.get("post_time"),
                "url": item.get("view_href"),
                "source": ReviewSource.FORUM.value
            })
 
        # Save raw data to raw storage
        if mapped_records:
            raw_df = pd.DataFrame(mapped_records)
            raw_path = Path("data/raw/forum_reviews.csv")
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_df.to_csv(raw_path, index=False, encoding="utf-8")
            logger.info("Saved %s raw Forum reviews to %s", len(mapped_records), raw_path)
 
        return mapped_records[:limit]
 
    def load(
        self,
        file_path: str | Path | None = None,
        *,
        use_live: bool = False,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        if use_live:
            return self.fetch_live(limit=limit)
 
        path = Path(file_path) if file_path else Path("data/raw/forum_reviews.csv")
        if not path.exists():
            path = DEFAULT_SAMPLE_PATH
            logger.warning("Raw Forum file not found, falling back to sample: %s", path)
 
        suffix = path.suffix.lower()
        if suffix == ".json":
            payload = json.loads(path.read_text(encoding="utf-8"))
            rows = payload if isinstance(payload, list) else payload.get("posts", [])
            records = [self._normalize_row(row) for row in rows]
            logger.info("Loaded %s forum records from %s", len(records), path)
            return records
 
        df = pd.read_csv(path)
        records = df.to_dict(orient="records")
        for record in records:
            record["source"] = ReviewSource.FORUM.value
        logger.info("Loaded %s Forum records from CSV %s", len(records), path)
        return records
 
    def _normalize_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "post_id": row.get("post_id") or row.get("id"),
            "title": row.get("title") or row.get("subject"),
            "body": row.get("body") or row.get("content") or row.get("text"),
            "author": row.get("author") or row.get("username"),
            "created_at": row.get("created_at") or row.get("date") or row.get("posted_at"),
            "url": row.get("url") or row.get("permalink"),
            "category": row.get("category"),
            "reply_count": row.get("reply_count"),
            "source": ReviewSource.FORUM.value,
        }

