from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

import pandas as pd

COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "review_id": ("review_id", "id", "external_id", "reviewId"),
    "rating": ("rating", "score", "stars", "star_rating"),
    "review_text": ("review_text", "text", "content", "body", "review", "comment"),
    "title": ("title", "subject", "headline"),
    "author": ("author", "user", "username", "reviewer", "user_name", "userName"),
    "review_date": ("review_date", "date", "created_at", "timestamp", "reviewDate"),
    "url": ("url", "link", "permalink"),
    "platform": ("platform", "device", "os"),
    "app_version": ("app_version", "version", "appVersion"),
    "source": ("source", "origin"),
}


@dataclass(frozen=True)
class CSVValidationResult:
    path: Path | None
    row_count: int
    columns: list[str]
    mapped_columns: dict[str, str]


class CSVLoadError(ValueError):
    """Raised when an uploaded CSV fails validation."""


class CSVUploader:
    """Load and validate review CSV uploads with flexible column mapping."""

    REQUIRED_FIELDS = ("review_text",)

    def __init__(self, min_rows: int = 1) -> None:
        self.min_rows = min_rows

    def load_file(self, file_path: str | Path) -> list[dict[str, Any]]:
        path = Path(file_path)
        if not path.exists():
            raise CSVLoadError(f"CSV file not found: {path}")

        df = pd.read_csv(path)
        validation = self.validate_dataframe(df, path=path)
        return self._records_from_dataframe(df, validation.mapped_columns)

    def load_upload(self, uploaded_file: Any) -> list[dict[str, Any]]:
        content = uploaded_file.read()
        if isinstance(content, bytes):
            buffer: StringIO | BytesIO = StringIO(content.decode("utf-8"))
        else:
            buffer = StringIO(content)

        df = pd.read_csv(buffer)
        validation = self.validate_dataframe(df)
        return self._records_from_dataframe(df, validation.mapped_columns)

    def validate_dataframe(
        self,
        df: pd.DataFrame,
        path: Path | None = None,
    ) -> CSVValidationResult:
        if df.empty:
            raise CSVLoadError("CSV file is empty")

        mapped = self._map_columns(df.columns.tolist())
        missing = [field for field in self.REQUIRED_FIELDS if field not in mapped]
        if missing:
            raise CSVLoadError(
                f"Missing required columns: {', '.join(missing)}. "
                f"Found columns: {', '.join(df.columns.tolist())}"
            )

        if len(df) < self.min_rows:
            raise CSVLoadError(
                f"CSV must contain at least {self.min_rows} data row(s); found {len(df)}"
            )

        return CSVValidationResult(
            path=path,
            row_count=len(df),
            columns=df.columns.tolist(),
            mapped_columns=mapped,
        )

    def _map_columns(self, columns: list[str]) -> dict[str, str]:
        normalized = {col: col.strip() for col in columns}
        lookup = {col.lower(): original for original, col in normalized.items()}
        mapped: dict[str, str] = {}

        for canonical, aliases in COLUMN_ALIASES.items():
            for alias in aliases:
                if alias.lower() in lookup:
                    mapped[canonical] = lookup[alias.lower()]
                    break

        return mapped

    def _records_from_dataframe(
        self,
        df: pd.DataFrame,
        mapped_columns: dict[str, str],
    ) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []

        for _, row in df.iterrows():
            record: dict[str, Any] = {}
            for canonical, original in mapped_columns.items():
                value = row.get(original)
                if pd.isna(value):
                    record[canonical] = None
                else:
                    record[canonical] = value
            records.append(record)

        return records
