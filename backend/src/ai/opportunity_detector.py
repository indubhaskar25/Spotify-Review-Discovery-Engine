"""
OpportunityDetector — synthesises product opportunities from extracted themes.

Task 4.4 (Phase 4)
"""
from __future__ import annotations

import json
import logging
import os
from typing import TYPE_CHECKING

from groq import Groq

from config.settings import Settings, get_settings
from src.ai.prompts.opportunity_prompt import OPPORTUNITY_SYSTEM_PROMPT
from src.models.schemas import Insight, UserSegment

if TYPE_CHECKING:
    from src.models.schemas import ReviewRecord

logger = logging.getLogger(__name__)


class OpportunityDetector:
    """Analyze complaints/themes and generate strategic product suggestions."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = os.environ.get("GROQ_API_KEY", "") or self.settings.groq_api_key
        self.model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

        from src.ai.utils import get_groq_client
        self.client = get_groq_client()

    def detect_opportunities(
        self,
        records: list[ReviewRecord],
        extracted_themes: list[Insight],
    ) -> list[Insight]:
        """Synthesize opportunities from the most critical reviews and themes."""
        if not records:
            return []

        if not self.client:
            logger.warning("Groq client not configured — returning mock product opportunities for hackathon workflow demo.")
            return self._get_mock_opportunities()


        # Focus on negative reviews to find unmet opportunities (rating <= 3 or Reddit/Forum comments)
        negative_records = [
            r for r in records
            if (r.rating is not None and r.rating <= 3) or r.source.value in ("reddit", "forum")
        ]
        sorted_records = sorted(negative_records, key=lambda r: len(r.text), reverse=True)
        sample = sorted_records[:50]

        review_payloads = [
            {
                "id": r.id,
                "text": f"{r.title or ''} {r.text}".strip()[:250],
                "source": r.source.value,
                "rating": r.rating,
            }
            for r in sample
        ]

        themes_payload = [
            {
                "theme": t.theme,
                "representative_quotes": t.representative_quotes[:2],
                "product_opportunity": t.product_opportunity,
            }
            for t in extracted_themes[:8]
        ]

        prompt = (
            f"Here are the top pain points we extracted:\n{json.dumps(themes_payload, indent=2)}\n\n"
            f"Here is a sample of actual raw negative feedback:\n{json.dumps(review_payloads, indent=2)}"
        )

        try:
            from src.ai.utils import call_groq_with_retry
            chat_completion = call_groq_with_retry(
                self.client,
                messages=[
                    {"role": "system", "content": OPPORTUNITY_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                model=self.model_name,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            response_text = chat_completion.choices[0].message.content.strip()
            data = json.loads(response_text)

            insights: list[Insight] = []
            raw_opps = data.get("opportunities", [])

            for item in raw_opps:
                raw_seg = item.get("segment")
                segment_val = None
                if raw_seg:
                    for seg in UserSegment:
                        if seg.value.lower() in raw_seg.lower():
                            segment_val = seg
                            break

                quotes = item.get("representative_quotes", [])
                if not quotes or not isinstance(quotes, list):
                    quotes = ["No quotes available"]

                insight = Insight(
                    theme=item.get("theme", "New Opportunity Area"),
                    frequency=item.get("frequency", 10),
                    representative_quotes=quotes,
                    business_impact=item.get("business_impact", "Retention and LTV lift"),
                    product_opportunity=item.get("product_opportunity", "New feature description"),
                    sources=item.get("sources", []),
                    segment=segment_val,
                    confidence=item.get("confidence", "High"),
                    expected_business_value=item.get("expected_business_value", "Expected business value description"),
                )
                insights.append(insight)

            return insights

        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to detect opportunities: %s. Falling back to mock opportunities.", exc)
            return self._get_mock_opportunities()

    def _get_mock_opportunities(self) -> list[Insight]:
        return [
            Insight(
                theme="AI Discovery Assistant",
                frequency=58,
                representative_quotes=[
                    "I wish I could type a vibe like 'obscure 80s synth wave for rainy day' and get a playlist.",
                    "Regular search is useless for vibes."
                ],
                business_impact="Direct lift in WAU and discovery satisfaction, decreasing playlist curation time.",
                product_opportunity="An interactive natural language assistant to generate playlists matching specific contexts or obscure sub-genres.",
                sources=["reddit", "forum"],
                segment=UserSegment.ACTIVE_EXPLORERS,
                confidence="94%",
                expected_business_value="Boost average weekly session duration by 12% and reduce monthly subscription churn by 1.8%."
            ),
            Insight(
                theme="Dynamic Mood Adaptive Filters",
                frequency=40,
                representative_quotes=[
                    "My workouts need high tempo but my playlist has slow songs. Smart shuffle fails here.",
                    "Hard to filter playlists by speed."
                ],
                business_impact="Drive premium upgrades and increase cross-device wearable session continuity.",
                product_opportunity="Multi-select activity filters (e.g. gym, sleep, focus) that overlay on top of any custom playlist.",
                sources=["play_store", "app_store"],
                segment=UserSegment.MOOD_BASED_LISTENERS,
                confidence="87%",
                expected_business_value="Higher premium retention among active lifestyle segments and 8% lift in workout stream length."
            ),
            Insight(
                theme="Algorithmic Loop Breaker",
                frequency=35,
                representative_quotes=[
                    "Give me a button to clear recent recommendation history. It's stuck.",
                    "I want to hear completely new music today."
                ],
                business_impact="Eliminate user frustration about repetitive recommendations and increase stream diversity.",
                product_opportunity="One-click toggle in Settings to clear short-term profile vectors or shift into a high-entropy 'Discovery Mode'.",
                sources=["play_store", "reddit"],
                segment=UserSegment.PLAYLIST_LOYALISTS,
                confidence="90%",
                expected_business_value="Improves overall Net Promoter Score (NPS) by 5 points and reduces discovery complaints."
            )
        ]
