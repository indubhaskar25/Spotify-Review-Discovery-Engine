from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ReviewSource(str, Enum):
    PLAY_STORE = "play_store"
    APP_STORE = "app_store"
    REDDIT = "reddit"
    FORUM = "forum"
    CSV = "csv"


class PipelineStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"


class UserSegment(str, Enum):
    PLAYLIST_LOYALISTS = "Playlist Loyalists"
    PASSIVE_LISTENERS = "Passive Listeners"
    ACTIVE_EXPLORERS = "Active Explorers"
    MOOD_BASED_LISTENERS = "Mood-Based Listeners"


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class ReviewRecord(BaseModel):
    id: str = Field(..., description="Stable hash of source + external identifier")
    source: ReviewSource
    text: str = Field(..., min_length=1)
    title: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    author: str | None = None
    created_at: datetime
    url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Review text cannot be empty")
        return cleaned


class Insight(BaseModel):
    theme: str
    frequency: int | float = Field(..., description="Count or relative prominence")
    representative_quotes: list[str] = Field(default_factory=list, min_length=1)
    business_impact: str
    product_opportunity: str
    sources: list[str] = Field(default_factory=list)
    segment: UserSegment | None = None

    # New fields for Page 3 (Pain Points) & Page 5 (Opportunities)
    root_cause: str | None = None
    severity: str | None = None  # e.g., "High", "Medium", "Low"
    trend: str | None = None  # e.g., "Increasing", "Stable", "Decreasing"
    affected_segments: list[str] | None = None
    confidence: str | None = None  # e.g., "94%", "High"
    expected_business_value: str | None = None


class SegmentDetail(BaseModel):
    name: str
    needs: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    representative_quotes: list[str] = Field(default_factory=list)
    number_of_reviews: int = 0


class InsightReport(BaseModel):
    dataset_id: str
    generated_at: datetime
    total_reviews: int
    sentiment_summary: dict[str, int] = Field(default_factory=dict)
    pain_points: list[Insight] = Field(default_factory=list)
    discovery_challenges: list[Insight] = Field(default_factory=list)
    segments: dict[str, int] = Field(default_factory=dict)
    segment_details: list[SegmentDetail] = Field(default_factory=list)
    opportunities: list[Insight] = Field(default_factory=list)
    executive_summary: str | None = None


class QAResponse(BaseModel):
    question: str
    answer: str
    citations: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class IngestionStats(BaseModel):
    source: ReviewSource
    total_input: int = 0
    normalized: int = 0
    dropped_short_text: int = 0
    dropped_noise: int = 0
    dropped_invalid: int = 0
    deduplicated: int = 0
    final_count: int = 0

    def merge(self, other: "IngestionStats") -> "IngestionStats":
        return IngestionStats(
            source=self.source,
            total_input=self.total_input + other.total_input,
            normalized=self.normalized + other.normalized,
            dropped_short_text=self.dropped_short_text + other.dropped_short_text,
            dropped_noise=self.dropped_noise + other.dropped_noise,
            dropped_invalid=self.dropped_invalid + other.dropped_invalid,
            deduplicated=self.deduplicated + other.deduplicated,
            final_count=self.final_count + other.final_count,
        )
