from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pandas as pd

from config.settings import Settings, get_settings
from src.models.schemas import IngestionStats, ReviewRecord

logger = logging.getLogger(__name__)


class RawStore:
    """Persist cleaned review records to Parquet and metadata sidecars."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.processed_dir = self.settings.data_path / "processed"
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def generate_dataset_id(self, source: str) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        suffix = uuid4().hex[:8]
        return f"{source}_{timestamp}_{suffix}"

    def save(
        self,
        records: list[ReviewRecord],
        dataset_id: str,
        stats: IngestionStats,
    ) -> Path:
        if not records:
            raise ValueError("Cannot persist an empty record set")

        parquet_path = self.processed_dir / f"{dataset_id}.parquet"
        metadata_path = self.processed_dir / f"{dataset_id}.meta.json"

        rows = [record.model_dump(mode="json") for record in records]
        df = pd.DataFrame(rows)
        df.to_parquet(parquet_path, index=False)

        metadata = {
            "dataset_id": dataset_id,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "record_count": len(records),
            "stats": stats.model_dump(mode="json"),
        }
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        logger.info("Saved %s records to %s", len(records), parquet_path)
        return parquet_path

    def load(self, dataset_id: str) -> list[ReviewRecord]:
        parquet_path = self.processed_dir / f"{dataset_id}.parquet"
        if not parquet_path.exists():
            raise FileNotFoundError(f"Processed dataset not found: {parquet_path}")

        df = pd.read_parquet(parquet_path)
        records: list[ReviewRecord] = []
        for row in df.to_dict(orient="records"):
            records.append(ReviewRecord.model_validate(row))
        return records

    def load_metadata(self, dataset_id: str) -> dict:
        metadata_path = self.processed_dir / f"{dataset_id}.meta.json"
        if not metadata_path.exists():
            raise FileNotFoundError(f"Dataset metadata not found: {metadata_path}")
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    def list_datasets(self) -> list[str]:
        return sorted(path.stem for path in self.processed_dir.glob("*.parquet"))
