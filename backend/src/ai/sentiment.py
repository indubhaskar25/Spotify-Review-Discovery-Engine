"""
SentimentAnalyzer — classifying sentiment (positive, neutral, negative) using Groq.

Task 4.1 (Phase 4)
"""
from __future__ import annotations

import json
import logging
import os
from typing import TYPE_CHECKING

from groq import Groq

from config.settings import Settings, get_settings
from src.models.schemas import SentimentLabel

if TYPE_CHECKING:
    from src.models.schemas import ReviewRecord

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Analyze sentiment of reviews in batches using Groq."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = os.environ.get("GROQ_API_KEY", "") or self.settings.openai_api_key
        self.model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

        self.client = None
        if self.api_key:
            self.client = Groq(api_key=self.api_key)

    def analyze_batch(self, records: list[ReviewRecord]) -> list[SentimentLabel]:
        """Analyze a list of ReviewRecords and return parallel SentimentLabels.

        Uses Groq to classify batch inputs for high performance.
        """
        if not records:
            return []

        # Default fallback to neutral if Groq client is not configured
        if not self.client:
            logger.warning("Groq client not configured in SentimentAnalyzer — defaulting to NEUTRAL.")
            return [SentimentLabel.NEUTRAL] * len(records)

        results: list[SentimentLabel] = [SentimentLabel.NEUTRAL] * len(records)
        batch_size = 30  # Classify 30 reviews in a single LLM call for efficiency

        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            
            # Prepare batch data structure for LLM
            inputs = []
            for idx, r in enumerate(batch):
                inputs.append({"index": idx, "text": f"{r.title or ''} {r.text}".strip()[:200]})

            prompt = (
                "You are a sentiment classifier. Analyze the sentiment of the following reviews. "
                "For each review, output either 'positive', 'neutral', or 'negative'. "
                "Respond ONLY with a JSON list of objects containing 'index' and 'sentiment'.\n\n"
                f"Reviews:\n{json.dumps(inputs, indent=2)}\n\n"
                "JSON Response:"
            )

            try:
                from src.ai.utils import call_groq_with_retry
                chat_completion = call_groq_with_retry(
                    self.client,
                    messages=[
                        {"role": "user", "content": prompt},
                    ],
                    model=self.model_name,
                    temperature=0.0,
                    response_format={"type": "json_object"},
                )
                response_text = chat_completion.choices[0].message.content.strip()
                data = json.loads(response_text)
                
                # Parse output list
                sentiments = data.get("sentiments", data.get("results", []))
                if not sentiments and isinstance(data, dict):
                    # fallback if JSON format has a different top key or is a list directly wrapped in dict
                    for k, val in data.items():
                        if isinstance(val, list):
                            sentiments = val
                            break

                for item in sentiments:
                    idx = item.get("index")
                    sentiment_str = item.get("sentiment", "neutral").lower()

                    if idx is not None and 0 <= idx < len(batch):
                        label = SentimentLabel.NEUTRAL
                        if "positive" in sentiment_str:
                            label = SentimentLabel.POSITIVE
                        elif "negative" in sentiment_str:
                            label = SentimentLabel.NEGATIVE
                        
                        results[i + idx] = label

            except Exception as exc:  # noqa: BLE001
                logger.error("Failed to run sentiment batch index %d: %s", i, exc)
                # Fail gracefully, leaving them as NEUTRAL

        return results
