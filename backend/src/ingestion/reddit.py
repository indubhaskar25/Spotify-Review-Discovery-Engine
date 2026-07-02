from __future__ import annotations
 
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
 
import pandas as pd
from config.settings import Settings, get_settings
from src.models.schemas import ReviewSource
 
logger = logging.getLogger(__name__)
 
DEFAULT_SAMPLE_PATH = Path("data/sample/reddit_sample.json")
DEFAULT_SUBREDDITS = ("spotify", "truespotify", "musicsuggestions")
 
 
class RedditCollector:
    """Load Reddit discussions from cache or fetch live via PRAW search."""
 
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
 
    @property
    def live_enabled(self) -> bool:
        return bool(
            self.settings.reddit_client_id
            and self.settings.reddit_client_secret
            and self.settings.reddit_user_agent
        )
 
    def fetch_live(
        self,
        subreddits: tuple[str, ...] = DEFAULT_SUBREDDITS,
        limit: int = 100,
        keywords: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        if not self.live_enabled:
            raise ValueError(
                "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be configured in .env "
                "for live Reddit search. Fallback to raw cached data or check README."
            )
 
        try:
            import praw
        except ImportError as exc:
            raise RuntimeError("PRAW is required for live Reddit ingestion") from exc
 
        reddit = praw.Reddit(
            client_id=self.settings.reddit_client_id,
            client_secret=self.settings.reddit_client_secret,
            user_agent=self.settings.reddit_user_agent,
        )
 
        if keywords is None:
            keywords = [
                "recommendation",
                "discover weekly",
                "music discovery",
                "AI DJ",
                "repetitive recommendations",
            ]
 
        raw_rows: list[dict[str, Any]] = []
 
        for subreddit_name in subreddits:
            try:
                subreddit = reddit.subreddit(subreddit_name)
                for kw in keywords:
                    logger.info("Searching Reddit r/%s for '%s'...", subreddit_name, kw)
                    # Fetch search results
                    submissions = list(subreddit.search(kw, limit=limit))
                    for sub in submissions:
                        created_utc_dt = datetime.fromtimestamp(sub.created_utc, tz=timezone.utc)
                        raw_rows.append(
                            {
                                "id": sub.id,
                                "type": "post",
                                "title": sub.title,
                                "body": sub.selftext,
                                "author": str(sub.author) if sub.author else None,
                                "created_utc": created_utc_dt.isoformat(),
                                "url": f"https://reddit.com{sub.permalink}",
                                "subreddit": subreddit_name,
                                "score": sub.score,
                                "num_comments": sub.num_comments,
                            }
                        )
 
                        # Fetch top comments for each search hit to capture discussions
                        try:
                            sub.comment_sort = "best"
                            sub.comments.replace_more(limit=0)
                            for comment in sub.comments[:10]:
                                comment_created = datetime.fromtimestamp(
                                    comment.created_utc,
                                    tz=timezone.utc,
                                )
                                raw_rows.append(
                                    {
                                        "id": comment.id,
                                        "type": "comment",
                                        "title": f"Comment on: {sub.title}",
                                        "body": comment.body,
                                        "author": str(comment.author) if comment.author else None,
                                        "created_utc": comment_created.isoformat(),
                                        "url": f"https://reddit.com{comment.permalink}",
                                        "subreddit": subreddit_name,
                                        "score": comment.score,
                                        "num_comments": 0,
                                    }
                                )
                        except Exception as ce:
                            logger.warning("Could not fetch comments for post %s: %s", sub.id, ce)
            except Exception as e:
                logger.error("Error searching Reddit r/%s: %s", subreddit_name, e)
 
        # Deduplicate raw_rows by id
        seen = set()
        unique_raw_rows = []
        for r in raw_rows:
            if r["id"] not in seen:
                seen.add(r["id"])
                unique_raw_rows.append(r)
 
        # Save raw data to raw storage
        raw_df = pd.DataFrame(unique_raw_rows)
        raw_path = Path("data/raw/reddit_reviews.csv")
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_df.to_csv(raw_path, index=False, encoding="utf-8")
        logger.info("Saved %s raw Reddit posts/comments to %s", len(unique_raw_rows), raw_path)
 
        mapped_records: list[dict[str, Any]] = []
        for row in unique_raw_rows:
            mapped_records.append(
                {
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "body": row.get("body"),
                    "author": row.get("author"),
                    "created_utc": row.get("created_utc"),
                    "url": row.get("url"),
                    "subreddit": row.get("subreddit"),
                    "score": row.get("score"),
                    "num_comments": row.get("num_comments"),
                    "source": ReviewSource.REDDIT.value,
                }
            )
        return mapped_records
 
    def load(
        self,
        file_path: str | Path | None = None,
        *,
        use_live: bool = False,
        subreddits: tuple[str, ...] = DEFAULT_SUBREDDITS,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        if use_live:
            return self.fetch_live(subreddits=subreddits, limit=limit)
 
        path = Path(file_path) if file_path else Path("data/raw/reddit_reviews.csv")
        if not path.exists():
            path = DEFAULT_SAMPLE_PATH
            logger.warning("Raw Reddit file not found, falling back to sample: %s", path)
 
        suffix = path.suffix.lower()
        if suffix == ".json":
            return self.load_cached(path)
 
        df = pd.read_csv(path)
        records = df.to_dict(orient="records")
        for record in records:
            record["source"] = ReviewSource.REDDIT.value
        logger.info("Loaded %s Reddit records from CSV %s", len(records), path)
        return records
 
    def load_cached(self, file_path: str | Path) -> list[dict[str, Any]]:
        path = Path(file_path)
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("posts", [])
        records = [self._normalize_cached_row(row) for row in rows]
        logger.info("Loaded %s cached Reddit records from %s", len(records), path)
        return records
 
    def _normalize_cached_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id") or row.get("post_id"),
            "title": row.get("title"),
            "body": row.get("body") or row.get("selftext") or row.get("text"),
            "author": row.get("author"),
            "created_utc": row.get("created_utc") or row.get("created_at") or row.get("date"),
            "url": row.get("url") or row.get("permalink"),
            "subreddit": row.get("subreddit"),
            "score": row.get("score"),
            "num_comments": row.get("num_comments"),
            "source": ReviewSource.REDDIT.value,
        }

