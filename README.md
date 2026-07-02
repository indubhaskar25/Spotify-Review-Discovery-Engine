# Spotify Review Discovery Engine

AI-powered application that collects and analyzes Spotify user feedback from multiple sources and generates actionable product insights through an interactive Next.js dashboard.

## Features

- Multi-source review ingestion (Play Store, App Store, Reddit, Community Forums)
- Semantic search with ChromaDB and Sentence Transformers (`all-MiniLM-L6-v2`)
- Groq-powered AI analysis for themes, sentiment, segments, and opportunities
- FastAPI REST backend with full CORS support
- Next.js (React) dashboard with Spotify-inspired dark theme
- Cited RAG Q&A over user reviews
- Export of insights to CSV/PDF

## Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- Groq API key (for AI analysis and Q&A)

## Setup

```bash
# 1. Clone and enter the repository
cd Spotify-Review-Discovery-Engine

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Configure environment variables
cp .env.example .env
# Edit .env and add:
#   GROQ_API_KEY=your_key_here
```

## Run the app

```bash
# Terminal 1 — Start the FastAPI backend (port 8000)
uvicorn src.api:app --reload --port 8000

# Terminal 2 — Start the Next.js frontend (port 3000)
cd frontend && npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Architecture

```
┌──────────────────┐      REST API      ┌──────────────────┐
│   Next.js (React) │ ───────────────── │   FastAPI (Python) │
│   Vercel deploy   │   JSON / CORS     │   uvicorn          │
└──────────────────┘                    └──────────┬───────┘
                                                   │
          ┌────────────────────────────────────────┤
          │                                        │
  ┌───────▼───────┐  ┌──────────▼──────────┐  ┌───▼──────────┐
  │ Ingestion     │  │  Embeddings +       │  │  Groq LLM     │
  │ (Play, App,   │  │  ChromaDB Vector    │  │  (Sentiment,  │
  │  Reddit, Forum)│  │  Store              │  │   Themes, Q&A) │
  └───────────────┘  └────────────────────┘  └──────────────┘
```

## Sample data

Bundled datasets for local development:

| File | Description |
|------|-------------|
| `data/sample/play_store_sample.csv` | 80 Google Play Store-style reviews |
| `data/sample/app_store_sample.csv` | 30 Apple App Store-style reviews |
| `data/sample/reddit_sample.json` | Cached Reddit posts |
| `data/sample/forum_sample.json` | Cached community forum posts |

## Ingestion pipeline (Phase 1)

```bash
python -m src.pipeline.ingest_pipeline --source play_store --file data/sample/play_store_sample.csv
python -m src.pipeline.ingest_pipeline --source app_store --file data/sample/app_store_sample.csv
python -m src.pipeline.ingest_pipeline --source reddit --file data/sample/reddit_sample.json
python -m src.pipeline.ingest_pipeline --source forum --file data/sample/forum_sample.json
```

## Embedding pipeline (Phase 2)

```bash
python -m src.pipeline.embed_pipeline --dataset-id <dataset_id>
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/datasets` | List processed datasets |
| POST | `/api/ingest` | Trigger ingestion |
| POST | `/api/embed` | Trigger embedding |
| GET | `/api/insights/{id}` | Get/generate insights |
| POST | `/api/ask` | RAG Q&A with citations |

## Project structure

```
frontend/       Next.js (React) dashboard
  src/pages/    Page routes (Overview, Pain Points, Discovery, Segments, Opportunities, Ask)
  src/lib/      API client
  src/styles/   Global CSS (Spotify dark theme)
src/            Python backend
  api.py        FastAPI REST server
  ingestion/    Data collectors and cleaners
  embeddings/   Sentence Transformer encoding
  storage/      Parquet + ChromaDB + insight cache
  retrieval/    Semantic search service
  ai/           Groq-powered sentiment, themes, segments, Q&A
  pipeline/     CLI orchestration scripts
  models/       Pydantic schemas
config/         Settings and logging
tests/          Unit and integration tests (40 tests)
data/           Sample datasets and runtime storage
Docs/           Problem statement and plans
app_streamlit/  Legacy Streamlit UI (preserved)
```

## Development

```bash
# Run all tests
pytest tests/ -v

# Type-check frontend
cd frontend && npx tsc --noEmit
```

## Implementation status

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | Complete | Scaffolding, config, models, sample data |
| 1 | Complete | Data ingestion and cleaning |
| 2 | Complete | Embeddings and vector store |
| 3 | Complete | Retrieval and RAG |
| 4 | Complete | AI analysis and insights |
| 5 | Complete | Next.js dashboard (replaced Streamlit) |
| 6 | Pending | Export and Vercel deployment |

## Documentation

- [Problem Statement](Docs/problemstatement.md)
- [Architecture](Docs/plan/architecture.md)

## License

MIT
