"""
SegmentClassifier — classify review records into segments using Groq.

Task 4.3 (Phase 4)
"""
from __future__ import annotations

import json
import logging
import os
from typing import TYPE_CHECKING

from groq import Groq

from config.settings import Settings, get_settings
from src.ai.prompts.segment_prompt import SEGMENT_SYSTEM_PROMPT
from src.models.schemas import UserSegment

if TYPE_CHECKING:
    from src.models.schemas import ReviewRecord

logger = logging.getLogger(__name__)


class SegmentClassifier:
    """Classify user reviews into strategic user segments."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = os.environ.get("GROQ_API_KEY", "") or self.settings.groq_api_key
        self.model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

        self.client = None
        if self.api_key:
            self.client = Groq(api_key=self.api_key)

    def classify_batch(self, records: list[ReviewRecord]) -> list[UserSegment]:
        """Classify a list of ReviewRecords into parallel UserSegments."""
        if not records:
            return []

        # Default fallback to Passive Listeners if Groq is not configured
        if not self.client:
            return [UserSegment.PASSIVE_LISTENERS] * len(records)

        results: list[UserSegment] = [UserSegment.PASSIVE_LISTENERS] * len(records)
        batch_size = 40  # Classify 40 reviews per batch call for efficiency

        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            
            inputs = []
            for idx, r in enumerate(batch):
                inputs.append({"index": idx, "text": f"{r.title or ''} {r.text}".strip()[:200]})

            prompt = f"Please classify the following batch of reviews:\n{json.dumps(inputs, indent=2)}"

            try:
                from src.ai.utils import call_groq_with_retry
                chat_completion = call_groq_with_retry(
                    self.client,
                    messages=[
                        {"role": "system", "content": SEGMENT_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    model=self.model_name,
                    temperature=0.0,
                    response_format={"type": "json_object"},
                )
                response_text = chat_completion.choices[0].message.content.strip()
                data = json.loads(response_text)
                
                classifications = data.get("classifications", [])
                for item in classifications:
                    idx = item.get("index")
                    segment_str = item.get("segment", "")

                    if idx is not None and 0 <= idx < len(batch):
                        # Match segment name
                        matched_segment = UserSegment.PASSIVE_LISTENERS
                        for seg in UserSegment:
                            if seg.value.lower() in segment_str.lower():
                                matched_segment = seg
                                break
                        results[i + idx] = matched_segment

            except Exception as exc:  # noqa: BLE001
                logger.error("Failed to run segment batch index %d: %s", i, exc)
                # Fail gracefully by leaving default segment

        return results
