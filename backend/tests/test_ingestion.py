from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pytest

from src.ingestion.cleaner import ReviewCleaner
from src.ingestion.csv_loader import CSVLoadError, CSVUploader
from src.ingestion.normalizer import Normalizer, NormalizationError
from src.ingestion.utils import (
    is_emoji_only,
    is_url_only,
    make_dedup_key,
    normalize_rating,
    parse_datetime,
    strip_html,
)
from src.models.schemas import ReviewRecord, ReviewSource
from src.pipeline.ingest_pipeline import IngestionService
from src.storage.raw_store import RawStore

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PLAY_STORE_SAMPLE = PROJECT_ROOT / "data" / "sample" / "play_store_sample.csv"
APP_STORE_SAMPLE = PROJECT_ROOT / "data" / "sample" / "app_store_sample.csv"
REDDIT_SAMPLE = PROJECT_ROOT / "data" / "sample" / "reddit_sample.json"
FORUM_SAMPLE = PROJECT_ROOT / "data" / "sample" / "forum_sample.json"


@pytest.fixture(autouse=True)
def clear_settings_cache():
    from config.settings import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def normalizer() -> Normalizer:
    return Normalizer()


@pytest.fixture
def cleaner() -> ReviewCleaner:
    return ReviewCleaner()


@pytest.fixture
def sample_record() -> ReviewRecord:
    return ReviewRecord(
        id="abc123",
        source=ReviewSource.PLAY_STORE,
        text="Discover Weekly keeps repeating the same artists every week.",
        rating=2,
        author="tester",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        metadata={"platform": "android"},
    )


def test_parse_datetime_supports_multiple_formats():
    assert parse_datetime("2025-01-15").tzinfo is not None
    assert parse_datetime("2025-01-15T10:00:00Z") == datetime(
        2025, 1, 15, 10, 0, tzinfo=timezone.utc
    )


def test_normalize_rating_bounds():
    assert normalize_rating(4) == 4
    assert normalize_rating("3") == 3
    assert normalize_rating(0) is None
    assert normalize_rating("invalid") is None


def test_strip_html_and_noise_detection():
    assert strip_html("<b>Great</b> app") == "Great app"
    assert is_url_only("https://example.com") is True
    assert is_emoji_only("😀😀😀") is True
    assert is_url_only("Great app with https://example.com link") is False


def test_csv_uploader_loads_play_store_sample():
    uploader = CSVUploader()
    records = uploader.load_file(PLAY_STORE_SAMPLE)
    assert len(records) == 80
    assert all(record["review_text"] for record in records)


def test_csv_uploader_validates_required_columns():
    uploader = CSVUploader()
    df = pd.DataFrame({"rating": [5], "author": ["user"]})
    with pytest.raises(CSVLoadError, match="Missing required columns"):
        uploader.validate_dataframe(df)


def test_csv_uploader_supports_upload_object():
    csv_content = "review_id,rating,review_text,author,review_date\n1,5,This is a valid review text,user,2025-01-01\n"

    class UploadStub:
        def read(self) -> str:
            return csv_content

    records = CSVUploader().load_upload(UploadStub())
    assert len(records) == 1
    assert records[0]["review_text"].startswith("This is a valid")


def test_normalizer_maps_play_store_record(normalizer: Normalizer):
    raw = {
        "review_id": "ps_0001",
        "rating": 4,
        "review_text": "Great discovery features overall.",
        "author": "user1",
        "review_date": "2025-01-04",
        "platform": "android",
        "app_version": "8.9.0",
    }
    record = normalizer.normalize(raw, source=ReviewSource.PLAY_STORE)
    assert record.source == ReviewSource.PLAY_STORE
    assert record.rating == 4
    assert record.metadata["platform"] == "android"


def test_normalizer_maps_app_store_record(normalizer: Normalizer):
    raw = {
        "id": "as_001",
        "rating": 5,
        "title": "Great discovery",
        "content": "Discover Weekly keeps getting better every Monday.",
        "userName": "ios_user_1",
        "date": "2025-02-02",
    }
    record = normalizer.normalize(raw, source=ReviewSource.APP_STORE)
    assert record.source == ReviewSource.APP_STORE
    assert "Discover Weekly" in record.text
    assert record.author == "ios_user_1"


def test_normalizer_maps_reddit_record(normalizer: Normalizer):
    raw = {
        "id": "reddit_001",
        "title": "Stale Discover Weekly",
        "body": "Same artists every week.",
        "author": "listener",
        "created_utc": "2025-03-01T10:15:00+00:00",
        "subreddit": "spotify",
    }
    record = normalizer.normalize(raw, source=ReviewSource.REDDIT)
    assert record.source == ReviewSource.REDDIT
    assert record.metadata["subreddit"] == "spotify"


def test_normalizer_rejects_missing_text(normalizer: Normalizer):
    with pytest.raises(NormalizationError):
        normalizer.normalize({"review_id": "1"}, source=ReviewSource.PLAY_STORE)


def test_cleaner_drops_short_and_duplicate_records(cleaner: ReviewCleaner, sample_record: ReviewRecord):
    short = sample_record.model_copy(update={"text": "too short"})
    duplicate = sample_record.model_copy(update={"id": "dup"})
    cleaned, stats = cleaner.clean(
        [sample_record, short, duplicate],
        source=ReviewSource.PLAY_STORE,
        total_input=3,
    )

    assert len(cleaned) == 1
    assert stats.dropped_short_text == 1
    assert stats.deduplicated == 1


def test_cleaner_drops_noise_posts(cleaner: ReviewCleaner, sample_record: ReviewRecord):
    url_only = sample_record.model_copy(update={"text": "https://example.com/only"})
    emoji_only = sample_record.model_copy(
        update={"text": "😀😀😀😀😀😀😀😀😀😀", "id": "emoji"}
    )
    cleaned, stats = cleaner.clean(
        [url_only, emoji_only],
        source=ReviewSource.PLAY_STORE,
    )
    assert cleaned == []
    assert stats.dropped_noise == 2


def test_dedup_key_is_stable():
    created = datetime(2025, 1, 1, tzinfo=timezone.utc)
    key_a = make_dedup_key("play_store", "Same text", created)
    key_b = make_dedup_key("play_store", "Same text", created)
    key_c = make_dedup_key("play_store", "Different text", created)
    assert key_a == key_b
    assert key_a != key_c


def test_ingestion_service_play_store(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "data" / "chroma"))

    service = IngestionService()
    result = service.ingest("play_store", file_path=PLAY_STORE_SAMPLE, persist=True)

    assert result.stats.final_count > 0
    assert result.parquet_path.exists()
    assert RawStore().load(result.dataset_id)


def test_ingestion_service_app_store(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "data" / "chroma"))

    result = IngestionService().ingest("app_store", file_path=APP_STORE_SAMPLE)
    assert result.stats.final_count == 30
    assert all(record.source == ReviewSource.APP_STORE for record in result.records)


def test_ingestion_service_reddit_and_forum(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "data" / "chroma"))

    reddit_result = IngestionService().ingest("reddit", file_path=REDDIT_SAMPLE)
    forum_result = IngestionService().ingest("forum", file_path=FORUM_SAMPLE)

    assert reddit_result.stats.final_count == 3
    assert forum_result.stats.final_count == 2


def test_raw_store_round_trip(tmp_path, monkeypatch, sample_record: ReviewRecord):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "data" / "chroma"))

    store = RawStore()
    dataset_id = store.generate_dataset_id("test")
    stats = ReviewCleaner().clean([sample_record], source=ReviewSource.PLAY_STORE)[1]
    store.save([sample_record], dataset_id, stats)

    loaded = store.load(dataset_id)
    metadata = store.load_metadata(dataset_id)

    assert len(loaded) == 1
    assert loaded[0].text == sample_record.text
    assert metadata["record_count"] == 1
