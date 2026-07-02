from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from config.settings import Settings, get_settings
from src.models.schemas import (
    Insight,
    PipelineStatus,
    ReviewRecord,
    ReviewSource,
    UserSegment,
)


def test_settings_load_with_defaults():
    settings = Settings(_env_file=None)
    assert settings.openai_model == "gpt-4o"
    assert settings.embedding_model == "all-MiniLM-L6-v2"
    assert settings.top_k_retrieval == 20


def test_get_settings_creates_data_dirs(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "data" / "chroma"))
    get_settings.cache_clear()

    settings = get_settings()
    assert settings.data_path.exists()
    assert (settings.data_path / "processed").exists()
    assert (settings.data_path / "sample").exists()

    get_settings.cache_clear()


def test_review_record_valid():
    record = ReviewRecord(
        id="play_store_001",
        source=ReviewSource.PLAY_STORE,
        text="Discover Weekly keeps playing the same artists.",
        rating=2,
        created_at=datetime(2025, 1, 15, tzinfo=timezone.utc),
        metadata={"platform": "android"},
    )
    assert record.source == ReviewSource.PLAY_STORE
    assert record.rating == 2


def test_review_record_rejects_empty_text():
    with pytest.raises(ValidationError):
        ReviewRecord(
            id="bad",
            source=ReviewSource.CSV,
            text="   ",
            created_at=datetime.now(timezone.utc),
        )


def test_review_record_rejects_invalid_rating():
    with pytest.raises(ValidationError):
        ReviewRecord(
            id="bad",
            source=ReviewSource.PLAY_STORE,
            text="Valid text",
            rating=6,
            created_at=datetime.now(timezone.utc),
        )


def test_insight_schema():
    insight = Insight(
        theme="Repetitive recommendations",
        frequency=42,
        representative_quotes=["Same songs every day on Discover Weekly."],
        business_impact="Reduced engagement with discovery features",
        product_opportunity="Improve diversity in recommendation models",
        sources=["play_store"],
        segment=UserSegment.ACTIVE_EXPLORERS,
    )
    assert insight.segment == UserSegment.ACTIVE_EXPLORERS


def test_pipeline_status_values():
    assert PipelineStatus.IDLE.value == "idle"
    assert PipelineStatus.COMPLETE.value == "complete"
