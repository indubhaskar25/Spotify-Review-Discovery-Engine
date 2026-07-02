"""
InsightCache — JSON persistence for calculated dashboard insights.

Task 4.6 (Phase 4)
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from config.settings import Settings, get_settings
from src.models.schemas import InsightReport

logger = logging.getLogger(__name__)


class InsightCache:
    """Save and load calculated InsightReport objects to/from JSON."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.insights_dir = self.settings.data_path / "insights"
        self.insights_dir.mkdir(parents=True, exist_ok=True)

    def cache_path(self, dataset_id: str) -> Path:
        """Return the JSON file path for a dataset_id."""
        return self.insights_dir / f"{dataset_id}.json"

    def exists(self, dataset_id: str) -> bool:
        """Return True if cached insights exist for the dataset_id."""
        return self.cache_path(dataset_id).exists()

    def save(self, report: InsightReport) -> Path:
        """Save an InsightReport as JSON."""
        path = self.cache_path(report.dataset_id)
        # Serialize to json format using Pydantic serialization
        serialized = report.model_dump(mode="json")
        path.write_text(json.dumps(serialized, indent=2), encoding="utf-8")
        logger.info("Saved insight report to: %s", path)
        return path

    def load(self, dataset_id: str) -> InsightReport:
        """Load a cached InsightReport from JSON."""
        path = self.cache_path(dataset_id)
        if not path.exists():
            raise FileNotFoundError(f"No cached insights for dataset_id={dataset_id!r}")
        raw_data = json.loads(path.read_text(encoding="utf-8"))
        return InsightReport.model_validate(raw_data)
