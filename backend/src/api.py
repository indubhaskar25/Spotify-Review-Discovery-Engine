"""
FastAPI application — REST bridge between Next.js frontend and Python backend.

Run locally:
    uvicorn src.api:app --reload --port 8000

Endpoints:
    GET  /api/health
    GET  /api/datasets
    POST /api/ingest
    POST /api/embed
    GET  /api/insights/{dataset_id}
    POST /api/ask
"""
from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()  # Load .env before any os.environ.get() calls

import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config.settings import get_settings
from src.ai.insight_generator import InsightGenerator
from src.models.schemas import QAResponse
from src.pipeline.embed_pipeline import run_embed_pipeline
from src.pipeline.ingest_pipeline import run_ingest_pipeline
from src.storage.insight_cache import InsightCache
from src.storage.raw_store import RawStore

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Spotify Review Discovery Engine API",
    description="AI-powered Spotify feedback analysis backend.",
    version="1.0.0",
)


@app.on_event("startup")
def on_startup() -> None:
    """Run automatic database initialization check and seed dataset reports if empty."""
    from src.storage.vector_store import VectorStoreManager
    from src.pipeline.ingest_pipeline import IngestionService
    from src.pipeline.embed_pipeline import run_embed_pipeline
    
    settings = get_settings()
    try:
        # Ensure directories exist
        settings.ensure_data_dirs()
        
        vsm = VectorStoreManager(settings)
        collections = vsm._client.list_collections()
        total_docs = sum(col.count() for col in collections)
        
        # If collections exist and have documents, skip initialization
        if len(collections) > 0 and total_docs > 0:
            print("[Startup] Existing vector database found. Initialization skipped.")
            print("=== ChromaDB Startup Collection Scan ===")
            for col in collections:
                print(f"Collection: '{col.name}' | Loaded Documents: {col.count()}")
            print("========================================\n")
            return
            
        print("[Startup] ChromaDB is empty or does not exist. Triggering automatic database initialization...")
        
        # Seeding targets
        seeding_targets = [
            {"source": "app_store", "dataset_id": "app_store_20260630_110857_4c70802c", "file_path": "data/sample/app_store_sample.csv"},
            {"source": "play_store", "dataset_id": "play_store_20260630_110855_5d8e1ddd", "file_path": "data/sample/play_store_sample.csv"},
            {"source": "reddit", "dataset_id": "reddit_20260630_110857_7aa47efc", "file_path": "data/sample/reddit_sample.json"},
            {"source": "forum", "dataset_id": "forum_20260630_110905_91530b4d", "file_path": "data/sample/forum_sample.json"},
        ]
        
        ingest_svc = IngestionService()
        
        for target in seeding_targets:
            source = target["source"]
            ds_id = target["dataset_id"]
            file_path = target["file_path"]
            
            print(f"[Startup] Ingesting reviews for source: '{source}' -> dataset_id: '{ds_id}'...")
            ingest_res = ingest_svc.ingest(
                source=source,
                file_path=file_path,
                dataset_id=ds_id,
                use_live=False,
                persist=True
            )
            print(f"  Successfully ingested {len(ingest_res.records)} records.")
            
            # Explicitly free memory after ingestion
            del ingest_res
            import gc
            gc.collect()
            
            print(f"[Startup] Encoding and indexing collection: '{ds_id}' in ChromaDB...")
            run_embed_pipeline(ds_id)
            
            # Explicitly collect garbage after embedding pipeline
            gc.collect()
            
            print(f"[Startup] Pre-computing and caching analytical insights for dataset: '{ds_id}'...")
            # Trigger insight generation report caching
            get_insights(ds_id, force_refresh=True)
            print(f"  Cached insights for '{ds_id}' successfully.")
            
            # Explicitly collect garbage after analytical insights generation
            gc.collect()
            
        print("[Startup] Automatic database initialization completed successfully!\n")
        
    except Exception as exc:
        print(f"\n❌ [Startup] Critical database initialization failed: {exc}")
        # Abort startup by raising a RuntimeError
        raise RuntimeError("Database initialization failed. Server startup aborted.") from exc

# ──────────────────────────────────────────────
# CORS — allow Vercel-deployed Next.js frontend
# ──────────────────────────────────────────────
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,https://*.vercel.app",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Request / Response models
# ──────────────────────────────────────────────

class IngestRequest(BaseModel):
    source: str  # "app_store", "play_store", "reddit", "forum"
    use_live: bool = False
    file_path: str | None = None


class EmbedRequest(BaseModel):
    dataset_id: str


class AskRequest(BaseModel):
    question: str
    dataset_id: str
    top_k: int = 15
    source_filter: str | None = None
    min_rating: int | None = None
    max_rating: int | None = None


class SearchRequest(BaseModel):
    query: str
    dataset_id: str
    top_k: int = 15
    source_filter: str | None = None
    min_rating: int | None = None
    max_rating: int | None = None



# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/api/health")
def health_check() -> dict[str, str]:
    """Returns API liveness status."""
    return {"status": "ok"}


@app.get("/api/datasets")
def list_datasets() -> dict[str, Any]:
    """List all processed datasets (Parquet files in data/processed/)."""
    settings = get_settings()
    raw_store = RawStore(settings)
    dataset_ids = raw_store.list_datasets()

    insight_cache = InsightCache(settings)
    result = []
    for ds_id in dataset_ids:
        try:
            meta = raw_store.load_metadata(ds_id)
        except Exception:
            meta = {}
        result.append({
            "dataset_id": ds_id,
            "record_count": meta.get("record_count", "?"),
            "saved_at": meta.get("saved_at", ""),
            "has_insights": insight_cache.exists(ds_id),
        })

    return {"datasets": result}


@app.post("/api/ingest")
def trigger_ingest(req: IngestRequest) -> dict[str, Any]:
    """Trigger Phase 1 ingestion for a given source."""
    try:
        result = run_ingest_pipeline(
            source=req.source,
            file_path=req.file_path,
            use_live_reddit=req.use_live,
            persist=True,
        )
        return {
            "dataset_id": result.dataset_id,
            "record_count": len(result.records),
            "parquet_path": str(result.parquet_path),
            "stats": result.stats.model_dump(),
        }
    except Exception as exc:
        logger.error("Ingest failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/embed")
def trigger_embed(req: EmbedRequest) -> dict[str, Any]:
    """Trigger Phase 2 embedding for a given dataset_id."""
    try:
        run_embed_pipeline(req.dataset_id)
        return {"status": "ok", "dataset_id": req.dataset_id}
    except Exception as exc:
        logger.error("Embed failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/insights/{dataset_id}")
def get_insights(dataset_id: str, force_refresh: bool = False) -> dict[str, Any]:
    """Return cached insights or compute them fresh for the given dataset."""
    settings = get_settings()
    insight_cache = InsightCache(settings)
    raw_store = RawStore(settings)

    # Return cached version unless force_refresh is requested
    if not force_refresh and insight_cache.exists(dataset_id):
        report = insight_cache.load(dataset_id)
        data = report.model_dump(mode="json")
        del report
        import gc
        gc.collect()
        return data

    # Compute fresh
    try:
        records = raw_store.load(dataset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}") from exc

    try:
        generator = InsightGenerator(settings)
        report = generator.generate_report(dataset_id, records)
        insight_cache.save(report)
        data = report.model_dump(mode="json")
        
        # Explicitly free memory
        del generator
        del report
        del records
        import gc
        gc.collect()
        
        return data
    except Exception as exc:
        logger.error("Insight generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/overview/{dataset_id}")
def get_overview(dataset_id: str, force_refresh: bool = False) -> dict[str, Any]:
    """Return overview information for the given dataset."""
    report = get_insights(dataset_id, force_refresh)
    return {
        "dataset_id": report.get("dataset_id"),
        "total_reviews": report.get("total_reviews"),
        "sentiment_summary": report.get("sentiment_summary"),
        "executive_summary": report.get("executive_summary"),
    }


@app.get("/api/pain-points/{dataset_id}")
def get_pain_points(dataset_id: str, force_refresh: bool = False) -> dict[str, Any]:
    """Return pain points list for the given dataset."""
    report = get_insights(dataset_id, force_refresh)
    return {"pain_points": report.get("pain_points", [])}


@app.get("/api/user-segments/{dataset_id}")
def get_user_segments(dataset_id: str, force_refresh: bool = False) -> dict[str, Any]:
    """Return segments and segment details for the given dataset."""
    report = get_insights(dataset_id, force_refresh)
    return {
        "segments": report.get("segments", {}),
        "segment_details": report.get("segment_details", []),
    }


@app.get("/api/opportunities/{dataset_id}")
def get_opportunities(dataset_id: str, force_refresh: bool = False) -> dict[str, Any]:
    """Return opportunities list for the given dataset."""
    report = get_insights(dataset_id, force_refresh)
    return {"opportunities": report.get("opportunities", [])}


@app.post("/api/ask")
def ask_question(req: AskRequest) -> QAResponse:
    """Perform RAG-based Q&A over the review dataset using Groq."""
    from src.ai.qa_service import QAService

    settings = get_settings()
    try:
        qa_svc = QAService(settings)
        response = qa_svc.ask(
            question=req.question,
            dataset_id=req.dataset_id,
            top_k=req.top_k,
            source_filter=req.source_filter,
            min_rating=req.min_rating,
            max_rating=req.max_rating,
        )
        return response
    except Exception as exc:
        logger.error("Q&A failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/search")
def search_reviews(req: SearchRequest) -> list[dict[str, Any]]:
    """Perform semantic search over the review collection."""
    from src.retrieval.retrieval_service import RetrievalService

    settings = get_settings()
    try:
        retrieval_svc = RetrievalService(settings)
        results = retrieval_svc.similarity_search(
            query=req.query,
            dataset_id=req.dataset_id,
            top_k=req.top_k,
            source_filter=req.source_filter,
            min_rating=req.min_rating,
            max_rating=req.max_rating,
        )
        return results
    except Exception as exc:
        logger.error("Search failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

