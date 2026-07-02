"""
embed_pipeline — orchestrates ingestion output → embedding → ChromaDB upsert.

Task 2.4 (Phase 2)

Usage (CLI)
-----------
    python -m src.pipeline.embed_pipeline --dataset-id app_store_20260630_110857_4c70802c

Usage (Python)
--------------
    from src.pipeline.embed_pipeline import run_embed_pipeline
    run_embed_pipeline("app_store_20260630_110857_4c70802c")
"""
from __future__ import annotations

import argparse
import logging

import numpy as np

from config.settings import get_settings
from src.embeddings.embedding_service import EmbeddingService
from src.models.schemas import ReviewRecord
from src.storage.raw_store import RawStore
from src.storage.vector_store import VectorStoreManager

logger = logging.getLogger(__name__)


def _build_embed_texts(records: list[ReviewRecord]) -> list[str]:
    """Combine title + text for each record into a single embeddable string."""
    return [f"{r.title or ''} {r.text}".strip() for r in records]


def run_embed_pipeline(dataset_id: str) -> None:
    """Load cleaned records, encode them, and upsert into ChromaDB.

    This function is idempotent:
    - If an embedding cache exists for ``dataset_id``, encoding is skipped.
    - ChromaDB upsert is safe to re-run (records keyed by ``record.id``).

    Parameters
    ----------
    dataset_id:
        The dataset identifier returned by the ingestion pipeline, e.g.
        ``"app_store_20260630_110857_4c70802c"``.
    """
    settings = get_settings()

    raw_store = RawStore(settings)
    embed_service = EmbeddingService(settings)
    vector_store = VectorStoreManager(settings)

    # ------------------------------------------------------------------
    # 1. Load cleaned records from Parquet
    # ------------------------------------------------------------------
    logger.info("[embed_pipeline] Loading records for dataset_id=%s", dataset_id)
    records: list[ReviewRecord] = raw_store.load(dataset_id)
    logger.info("[embed_pipeline] Loaded %d records.", len(records))

    if not records:
        logger.error("[embed_pipeline] No records found — aborting.")
        return

    texts = _build_embed_texts(records)

    # ------------------------------------------------------------------
    # 2. Encode (use cache if available)
    # ------------------------------------------------------------------
    if embed_service.is_cached(dataset_id):
        logger.info("[embed_pipeline] Embedding cache found. Loading from disk.")
        embeddings_np = embed_service.load_cache(dataset_id)

        if embeddings_np.shape[0] != len(records):
            logger.warning(
                "[embed_pipeline] Cache size mismatch (cache=%d, records=%d). Re-encoding.",
                embeddings_np.shape[0],
                len(records),
            )
            embeddings_np = embed_service.encode_batch(texts, show_progress=True)
            embed_service.save_cache(dataset_id, embeddings_np)
    else:
        logger.info("[embed_pipeline] No cache found. Encoding %d texts…", len(texts))
        embeddings_np = embed_service.encode_batch(texts, show_progress=True)
        embed_service.save_cache(dataset_id, embeddings_np)

    # ------------------------------------------------------------------
    # 3. Upsert into ChromaDB
    # ------------------------------------------------------------------
    embeddings_list: list[list[float]] = embeddings_np.tolist()

    logger.info(
        "[embed_pipeline] Upserting %d vectors into ChromaDB (dataset_id=%s)…",
        len(records),
        dataset_id,
    )
    vector_store.upsert_records(records, embeddings_list, dataset_id)

    total_in_collection = vector_store.count(dataset_id)
    logger.info(
        "[embed_pipeline] Done. Collection total: %d vectors for dataset_id=%s",
        total_in_collection,
        dataset_id,
    )


# ------------------------------------------------------------------
# CLI entry point
# ------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Phase 2 embed pipeline for a given dataset_id."
    )
    parser.add_argument(
        "--dataset-id",
        required=True,
        help="dataset_id produced by the ingestion pipeline (e.g. app_store_20260630_…)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    run_embed_pipeline(args.dataset_id)
