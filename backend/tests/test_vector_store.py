"""
Unit tests for Phase 2 — VectorStoreManager & EmbeddingService.

Task 2.7 (Phase 2)

Run with:
    pytest tests/test_vector_store.py -v
"""
from __future__ import annotations

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from src.models.schemas import ReviewRecord, ReviewSource


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def sample_records() -> list[ReviewRecord]:
    """Five minimal ReviewRecord objects for testing."""
    base_dt = datetime(2026, 1, 1, tzinfo=timezone.utc)
    data = [
        ("r1", ReviewSource.APP_STORE,  "Discover Weekly used to be gold. Now it repeats the same artists.", "Stale recommendations", 1),
        ("r2", ReviewSource.REDDIT,     "Algorithm keeps looping the same 20 songs from my 5000 song library.", "Shuffle loop problem", None),
        ("r3", ReviewSource.APP_STORE,  "Too many ads if you don't have premium. Unusable for free users.", "Ad overload", 2),
        ("r4", ReviewSource.PLAY_STORE, "I love the playlist features. Very easy to discover new music.", "Great discovery", 5),
        ("r5", ReviewSource.FORUM,      "Spotify should add community tags like Steam so we can browse by mood.", "Feature request tags", None),
    ]
    return [
        ReviewRecord(
            id=rid,
            source=source,
            text=text,
            title=title,
            rating=rating,
            created_at=base_dt,
        )
        for rid, source, text, title, rating in data
    ]


@pytest.fixture()
def sample_embeddings() -> list[list[float]]:
    """Five random 384-dim vectors (matching all-MiniLM-L6-v2 output dim)."""
    rng = np.random.default_rng(42)
    return rng.standard_normal((5, 384)).astype(np.float32).tolist()


@pytest.fixture()
def tmp_settings(tmp_path: Path):
    """Settings pointing to a temporary directory so tests don't touch real data."""
    from config.settings import Settings

    return Settings(
        chroma_persist_dir=str(tmp_path / "chroma"),
        data_dir=str(tmp_path),
        groq_api_key="test-key",
    )


# ---------------------------------------------------------------------------
# EmbeddingService tests
# ---------------------------------------------------------------------------

class TestEmbeddingService:
    def test_cache_path_format(self, tmp_settings):
        from src.embeddings.embedding_service import EmbeddingService

        svc = EmbeddingService(settings=tmp_settings)
        path = svc.cache_path("my_dataset_123")
        assert path.name == "my_dataset_123.npy"
        assert path.parent == tmp_settings.data_path / "embeddings"

    def test_is_cached_false_before_save(self, tmp_settings):
        from src.embeddings.embedding_service import EmbeddingService

        svc = EmbeddingService(settings=tmp_settings)
        assert not svc.is_cached("nonexistent_dataset")

    def test_save_and_load_cache(self, tmp_settings):
        from src.embeddings.embedding_service import EmbeddingService

        svc = EmbeddingService(settings=tmp_settings)
        vecs = np.random.default_rng(0).standard_normal((10, 384)).astype(np.float32)

        path = svc.save_cache("ds_test", vecs)
        assert path.exists()
        assert svc.is_cached("ds_test")

        loaded = svc.load_cache("ds_test")
        np.testing.assert_array_almost_equal(vecs, loaded)

    def test_load_cache_missing_raises(self, tmp_settings):
        from src.embeddings.embedding_service import EmbeddingService

        svc = EmbeddingService(settings=tmp_settings)
        with pytest.raises(FileNotFoundError):
            svc.load_cache("does_not_exist")

    def test_encode_batch_calls_model(self, tmp_settings):
        """encode_batch should invoke the sentence-transformer model."""
        from src.embeddings.embedding_service import EmbeddingService

        svc = EmbeddingService(settings=tmp_settings)

        mock_model = MagicMock()
        mock_model.encode.return_value = np.zeros((3, 384), dtype=np.float32)
        svc._model = mock_model  # inject mock, skip loading

        result = svc.encode_batch(["text a", "text b", "text c"], show_progress=False)

        assert mock_model.encode.called
        assert result.shape == (3, 384)
        assert result.dtype == np.float32

    def test_encode_batch_empty_raises(self, tmp_settings):
        from src.embeddings.embedding_service import EmbeddingService

        svc = EmbeddingService(settings=tmp_settings)
        with pytest.raises(ValueError, match="empty"):
            svc.encode_batch([])


# ---------------------------------------------------------------------------
# VectorStoreManager tests
# ---------------------------------------------------------------------------

class TestVectorStoreManager:
    def test_collection_not_exists_initially(self, tmp_settings):
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        assert not vsm.collection_exists("brand_new_dataset")

    def test_upsert_creates_collection(self, tmp_settings, sample_records, sample_embeddings):
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        vsm.upsert_records(sample_records, sample_embeddings, "test_ds_001")

        assert vsm.collection_exists("test_ds_001")
        assert vsm.count("test_ds_001") == 5

    def test_upsert_is_idempotent(self, tmp_settings, sample_records, sample_embeddings):
        """Calling upsert twice on the same dataset must not duplicate vectors."""
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        vsm.upsert_records(sample_records, sample_embeddings, "test_ds_idem")
        vsm.upsert_records(sample_records, sample_embeddings, "test_ds_idem")

        assert vsm.count("test_ds_idem") == 5  # still 5, not 10

    def test_upsert_empty_list_warns(self, tmp_settings):
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        # Should log a warning but not raise
        vsm.upsert_records([], [], "test_empty_ds")

    def test_upsert_length_mismatch_raises(self, tmp_settings, sample_records):
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        wrong_embeddings = [[0.0] * 384]  # only 1 embedding for 5 records
        with pytest.raises(ValueError, match="!="):
            vsm.upsert_records(sample_records, wrong_embeddings, "test_mismatch")

    def test_similarity_search_returns_results(self, tmp_settings, sample_records, sample_embeddings):
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        vsm.upsert_records(sample_records, sample_embeddings, "test_search_ds")

        query_vec = sample_embeddings[0]  # query with the first record's own embedding
        results = vsm.similarity_search(query_vec, "test_search_ds", top_k=3)

        assert len(results) == 3
        assert results[0]["id"] == "r1"  # exact match should be nearest
        assert "document" in results[0]
        assert "distance" in results[0]
        assert "metadata" in results[0]

    def test_similarity_search_metadata_fields(self, tmp_settings, sample_records, sample_embeddings):
        """Metadata must contain source, rating, title, author, created_at."""
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        vsm.upsert_records(sample_records, sample_embeddings, "test_meta_ds")

        results = vsm.similarity_search(sample_embeddings[0], "test_meta_ds", top_k=1)
        meta = results[0]["metadata"]

        assert "source" in meta
        assert "rating" in meta
        assert "title" in meta
        assert "author" in meta
        assert "created_at" in meta

    def test_similarity_search_empty_collection(self, tmp_settings):
        """Searching an empty collection returns an empty list, not an error."""
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        query_vec = [0.0] * 384
        results = vsm.similarity_search(query_vec, "empty_collection_ds", top_k=5)
        assert results == []

    def test_delete_collection(self, tmp_settings, sample_records, sample_embeddings):
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        vsm.upsert_records(sample_records, sample_embeddings, "test_delete_ds")
        assert vsm.collection_exists("test_delete_ds")

        vsm.delete_collection("test_delete_ds")
        assert not vsm.collection_exists("test_delete_ds")

    def test_similarity_search_with_metadata_filter(self, tmp_settings, sample_records, sample_embeddings):
        """Filter by source should restrict results to that source."""
        from src.storage.vector_store import VectorStoreManager

        vsm = VectorStoreManager(settings=tmp_settings)
        vsm.upsert_records(sample_records, sample_embeddings, "test_filter_ds")

        results = vsm.similarity_search(
            sample_embeddings[0],
            "test_filter_ds",
            top_k=10,
            filter_metadata={"source": "app_store"},
        )
        assert len(results) > 0
        for r in results:
            assert r["metadata"]["source"] == "app_store"
