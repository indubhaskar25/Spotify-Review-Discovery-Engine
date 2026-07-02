"""
RetrievalService — similarity search w/ metadata filters and embeddings.

Task 3.1 (Phase 3)
"""
from __future__ import annotations

import logging
from typing import Any

from config.settings import Settings, get_settings
from src.embeddings.embedding_service import EmbeddingService
from src.storage.vector_store import VectorStoreManager

logger = logging.getLogger(__name__)


class RetrievalService:
    """Perform semantic search across indexed review vectors in ChromaDB."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.embed_service = EmbeddingService(self.settings)
        self.vector_store = VectorStoreManager(self.settings)

    def similarity_search(
        self,
        query: str,
        dataset_id: str,
        top_k: int | None = None,
        source_filter: str | None = None,
        min_rating: int | None = None,
        max_rating: int | None = None,
    ) -> list[dict[str, Any]]:
        """Search the dataset_id collection for documents matching the query.

        Parameters
        ----------
        query:
            Plain text query.
        dataset_id:
            Which dataset collection to search.
        top_k:
            Number of results to retrieve.
        source_filter:
            Optional review source value, e.g. "app_store".
        min_rating:
            Optional minimum rating filter (1-5).
        max_rating:
            Optional maximum rating filter (1-5).
        """
        # 1. Encode query
        logger.info("Encoding query: %r", query)
        query_vec = self.embed_service.encode_batch([query], show_progress=False)[0].tolist()

        # 2. Build ChromaDB where clause
        where_clause: dict[str, Any] = {}
        filters: list[dict[str, Any]] = []

        if source_filter:
            filters.append({"source": source_filter})

        if min_rating is not None or max_rating is not None:
            # Note: rating is stored as -1 if null in database
            if min_rating is not None and max_rating is not None:
                if min_rating == max_rating:
                    filters.append({"rating": min_rating})
                else:
                    filters.append({"rating": {"$gte": min_rating}})
                    filters.append({"rating": {"$lte": max_rating}})
            elif min_rating is not None:
                filters.append({"rating": {"$gte": min_rating}})
            elif max_rating is not None:
                filters.append({"rating": {"$lte": max_rating}})

        if len(filters) > 1:
            where_clause = {"$and": filters}
        elif len(filters) == 1:
            where_clause = filters[0]
        else:
            where_clause = {}

        # 3. Query vector store
        logger.info("Searching collection for dataset_id=%s w/ filters=%s", dataset_id, where_clause)
        results = self.vector_store.similarity_search(
            query_embedding=query_vec,
            dataset_id=dataset_id,
            top_k=top_k,
            filter_metadata=where_clause if where_clause else None,
        )
        return results
