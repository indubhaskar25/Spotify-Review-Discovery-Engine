"""
VectorStoreManager — ChromaDB CRUD and similarity search.

Task 2.3 / 2.6 (Phase 2)

One ChromaDB collection per dataset_id:  ``spotify_reviews_{dataset_id}``
"""
from __future__ import annotations

import logging
from typing import Any

import chromadb
from chromadb import Collection
from chromadb.config import Settings as ChromaSettings

from config.settings import Settings, get_settings
from src.models.schemas import ReviewRecord

logger = logging.getLogger(__name__)

_COLLECTION_PREFIX = "spotify_reviews"


def _collection_name(dataset_id: str) -> str:
    """Return the ChromaDB collection name for a given dataset_id.

    ChromaDB collection names must be 3–63 characters, alphanumeric + hyphens,
    start/end with alphanumeric. We sanitize the dataset_id accordingly.
    """
    sanitized = dataset_id.replace("_", "-")[:50]
    return f"{_COLLECTION_PREFIX}-{sanitized}"


class VectorStoreManager:
    """Manage a per-dataset ChromaDB collection for review embeddings.

    Provides:
    - ``upsert_records`` — store or update records with pre-computed embeddings.
    - ``similarity_search`` — return top-k nearest neighbours with metadata.
    - ``delete_collection`` — remove a dataset's collection entirely.
    - ``collection_exists`` — check whether a collection has been indexed.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        chroma_path = str(self.settings.chroma_path)
        self.settings.chroma_path.mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(
            path=chroma_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client initialised at: %s", chroma_path)

    # ------------------------------------------------------------------
    # Collection helpers
    # ------------------------------------------------------------------

    def _get_or_create_collection(self, dataset_id: str) -> Collection:
        name = _collection_name(dataset_id)
        collection = self._client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )
        return collection

    def collection_exists(self, dataset_id: str) -> bool:
        """Return True if a collection for this dataset_id already exists."""
        name = _collection_name(dataset_id)
        existing = [c.name for c in self._client.list_collections()]
        return name in existing

    def delete_collection(self, dataset_id: str) -> None:
        """Permanently delete the ChromaDB collection for this dataset."""
        name = _collection_name(dataset_id)
        try:
            self._client.delete_collection(name)
            logger.info("Deleted collection: %s", name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not delete collection %s: %s", name, exc)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def upsert_records(
        self,
        records: list[ReviewRecord],
        embeddings: list[list[float]],
        dataset_id: str,
    ) -> None:
        """Upsert review records with their pre-computed embeddings.

        Safe to call multiple times on the same dataset — existing vectors are
        updated in place (idempotent by ``record.id``).

        Parameters
        ----------
        records:
            Cleaned ``ReviewRecord`` objects.
        embeddings:
            Parallel list of embedding vectors (one per record).
        dataset_id:
            Identifies the ChromaDB collection to upsert into.
        """
        if len(records) != len(embeddings):
            raise ValueError(
                f"records length ({len(records)}) != embeddings length ({len(embeddings)})"
            )
        if not records:
            logger.warning("upsert_records called with empty list — nothing to store.")
            return

        collection = self._get_or_create_collection(dataset_id)

        ids: list[str] = []
        docs: list[str] = []
        metas: list[dict[str, Any]] = []

        for record in records:
            ids.append(record.id)
            # Document text used for display in search results
            docs.append(f"{record.title or ''} {record.text}".strip())
            # Metadata available as ChromaDB filter predicates
            metas.append(
                {
                    "source": record.source.value,
                    "rating": record.rating if record.rating is not None else -1,
                    "author": record.author or "",
                    "title": record.title or "",
                    "created_at": record.created_at.isoformat() if record.created_at else "",
                    "dataset_id": dataset_id,
                }
            )

        # Upsert in batches of 500 (ChromaDB recommended limit)
        batch_size = 500
        for i in range(0, len(ids), batch_size):
            collection.upsert(
                ids=ids[i : i + batch_size],
                embeddings=embeddings[i : i + batch_size],
                documents=docs[i : i + batch_size],
                metadatas=metas[i : i + batch_size],
            )
            logger.debug("Upserted batch %d–%d into %s", i, i + batch_size, collection.name)

        logger.info(
            "Upserted %d records into collection '%s' (total in collection: %d)",
            len(records),
            collection.name,
            collection.count(),
        )

    # ------------------------------------------------------------------
    # Read / Search
    # ------------------------------------------------------------------

    def similarity_search(
        self,
        query_embedding: list[float],
        dataset_id: str,
        top_k: int | None = None,
        filter_metadata: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Return top-k most similar records for a query embedding.

        Parameters
        ----------
        query_embedding:
            The encoded query vector.
        dataset_id:
            Which collection to search.
        top_k:
            Number of results to return (defaults to ``settings.top_k_retrieval``).
        filter_metadata:
            Optional ChromaDB ``where`` clause for metadata filtering, e.g.
            ``{"source": "app_store"}`` or ``{"rating": {"$lte": 2}}``.

        Returns
        -------
        List of result dicts with keys: ``id``, ``document``, ``distance``, ``metadata``.
        """
        k = top_k or self.settings.top_k_retrieval
        collection = self._get_or_create_collection(dataset_id)

        if collection.count() == 0:
            logger.warning("Collection '%s' is empty — returning no results.", collection.name)
            return []

        query_kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(k, collection.count()),
            "include": ["documents", "distances", "metadatas"],
        }
        if filter_metadata:
            query_kwargs["where"] = filter_metadata

        results = collection.query(**query_kwargs)

        output: list[dict[str, Any]] = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        for rid, doc, dist, meta in zip(ids, docs, distances, metadatas):
            output.append(
                {
                    "id": rid,
                    "document": doc,
                    "distance": dist,
                    "metadata": meta,
                }
            )

        logger.debug("Similarity search returned %d results for dataset_id=%s", len(output), dataset_id)
        return output

    def count(self, dataset_id: str) -> int:
        """Return the number of vectors stored for a dataset."""
        collection = self._get_or_create_collection(dataset_id)
        return collection.count()
