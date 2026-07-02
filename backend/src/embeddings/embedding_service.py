"""
EmbeddingService — batch text encoding with sentence-transformers.

Task 2.1 / 2.2 (Phase 2)
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
from tqdm import tqdm

from config.settings import Settings, get_settings

if TYPE_CHECKING:
    from numpy.typing import NDArray

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Encode text into dense vectors using a local sentence-transformers model.

    Features
    --------
    - Lazy model loading (model only loads on first encode call).
    - Batch encoding with configurable batch size and tqdm progress bar.
    - On-disk numpy cache so unchanged datasets are never re-encoded.
    """

    # Class-level cache to ensure only one instance of the embedding model exists
    _shared_model = None
    _shared_model_name = None

    def __init__(
        self,
        settings: Settings | None = None,
        batch_size: int = 64,
    ) -> None:
        self.settings = settings or get_settings()
        self.model_name = self.settings.embedding_model
        self.batch_size = batch_size
        self._model = None  # lazy-loaded

        self._cache_dir = self.settings.data_path / "embeddings"
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Model lifecycle
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """Load the sentence-transformers model on first use."""
        if self._model is not None:
            return
        if EmbeddingService._shared_model is None or EmbeddingService._shared_model_name != self.model_name:
            import os
            # Set Hugging Face cache path to be inside the persistent data directory
            hf_cache_dir = self.settings.data_path / "huggingface"
            hf_cache_dir.mkdir(parents=True, exist_ok=True)
            os.environ["HF_HOME"] = str(hf_cache_dir)
            os.environ["SENTENCE_TRANSFORMERS_HOME"] = str(hf_cache_dir)

            from sentence_transformers import SentenceTransformer  # noqa: PLC0415

            logger.info("Loading embedding model: %s (cache_dir: %s)", self.model_name, hf_cache_dir)
            EmbeddingService._shared_model = SentenceTransformer(self.model_name)
            EmbeddingService._shared_model_name = self.model_name
            logger.info("Embedding model loaded.")
        self._model = EmbeddingService._shared_model

    # ------------------------------------------------------------------
    # Core encoding
    # ------------------------------------------------------------------

    def encode_batch(
        self,
        texts: list[str],
        show_progress: bool = True,
    ) -> NDArray[np.float32]:
        """Encode a list of texts into a float32 numpy array.

        Parameters
        ----------
        texts:
            Raw text strings to encode. Must be non-empty.
        show_progress:
            Display a tqdm progress bar per batch.

        Returns
        -------
        NDArray of shape ``(len(texts), embedding_dim)``.
        """
        if not texts:
            raise ValueError("texts list must not be empty")

        self._load_model()

        all_embeddings: list[NDArray[np.float32]] = []
        num_batches = (len(texts) + self.batch_size - 1) // self.batch_size

        logger.info(
            "Encoding %d texts in %d batches (batch_size=%d)",
            len(texts),
            num_batches,
            self.batch_size,
        )

        with tqdm(
            total=len(texts),
            desc="Embedding",
            unit="doc",
            disable=not show_progress,
        ) as pbar:
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i : i + self.batch_size]
                vecs = self._model.encode(
                    batch,
                    convert_to_numpy=True,
                    show_progress_bar=False,
                )
                all_embeddings.append(vecs.astype(np.float32))
                pbar.update(len(batch))

        result = np.vstack(all_embeddings)
        logger.info("Encoding complete. Shape: %s", result.shape)
        return result

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------

    def cache_path(self, dataset_id: str) -> Path:
        """Return the .npy cache file path for a given dataset_id."""
        return self._cache_dir / f"{dataset_id}.npy"

    def is_cached(self, dataset_id: str) -> bool:
        """Return True if embeddings for this dataset are already on disk."""
        return self.cache_path(dataset_id).exists()

    def save_cache(self, dataset_id: str, embeddings: NDArray[np.float32]) -> Path:
        """Persist embeddings to ``data/embeddings/{dataset_id}.npy``."""
        path = self.cache_path(dataset_id)
        np.save(path, embeddings)
        logger.info("Embedding cache saved: %s  shape=%s", path, embeddings.shape)
        return path

    def load_cache(self, dataset_id: str) -> NDArray[np.float32]:
        """Load previously cached embeddings from disk."""
        path = self.cache_path(dataset_id)
        if not path.exists():
            raise FileNotFoundError(f"No embedding cache for dataset_id={dataset_id!r}")
        embeddings = np.load(path).astype(np.float32)
        logger.info("Embedding cache loaded: %s  shape=%s", path, embeddings.shape)
        return embeddings

    # ------------------------------------------------------------------
    # Convenience
    # ------------------------------------------------------------------

    @property
    def embedding_dim(self) -> int:
        """Return the dimension of the loaded model's output vectors."""
        self._load_model()
        return self._model.get_sentence_embedding_dimension()
