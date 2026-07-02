"""
chroma_retriever — LangChain retriever wrapper over ChromaDB.

Task 3.3 (Phase 3)
"""
from __future__ import annotations

from typing import Any

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from src.retrieval.retrieval_service import RetrievalService


class ChromaRetriever(BaseRetriever):
    """LangChain-compatible retriever wrapper for RetrievalService."""

    retrieval_service: RetrievalService
    dataset_id: str
    top_k: int = 10
    source_filter: str | None = None
    min_rating: int | None = None
    max_rating: int | None = None

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun | None = None,
    ) -> list[Document]:
        results = self.retrieval_service.similarity_search(
            query=query,
            dataset_id=self.dataset_id,
            top_k=self.top_k,
            source_filter=self.source_filter,
            min_rating=self.min_rating,
            max_rating=self.max_rating,
        )

        documents = []
        for r in results:
            doc = Document(
                page_content=r["document"],
                metadata={
                    "id": r["id"],
                    "distance": r["distance"],
                    **r["metadata"],
                },
            )
            documents.append(doc)
        return documents
