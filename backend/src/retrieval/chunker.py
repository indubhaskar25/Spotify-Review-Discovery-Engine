"""
chunker — chunking strategy for long forum/Reddit posts.

Task 3.2 (Phase 3)
"""
from __future__ import annotations


class Chunker:
    """Split long texts into smaller semantic chunks for retrieval."""

    def __init__(self, chunk_size: int = 600, overlap: int = 100) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap

    def split_text(self, text: str) -> list[str]:
        """Split a text string into overlapping chunks.

        If text is shorter than chunk_size, it returns a single chunk.
        """
        text = text.strip()
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunks.append(text[start:end].strip())
            start += self.chunk_size - self.overlap

        return chunks
