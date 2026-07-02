# Project Structure

## Repository Layout

```
Spotify-Review-Discovery-Engine/
├── app/                          # Streamlit application
│   ├── main.py                   # App entry point
│   ├── styles/
│   │   └── custom.css            # Dark theme overrides
│   ├── components/
│   │   ├── sidebar.py            # Upload, filters, pipeline trigger
│   │   ├── pipeline_status.py    # Progress and error states
│   │   ├── charts.py             # Reusable Plotly chart builders
│   │   └── export_panel.py       # CSV/PDF download buttons
│   └── pages/
│       ├── 01_overview.py
│       ├── 02_pain_points.py
│       ├── 03_discovery.py
│       ├── 04_segments.py
│       ├── 05_opportunities.py
│       └── 06_ask.py
│
├── src/                          # Core business logic
│   ├── models/
│   │   └── schemas.py            # ReviewRecord, Insight, PipelineStatus
│   ├── ingestion/
│   │   ├── csv_loader.py
│   │   ├── normalizer.py
│   │   ├── cleaner.py
│   │   ├── play_store.py
│   │   ├── app_store.py
│   │   ├── reddit.py
│   │   └── forum.py
│   ├── embeddings/
│   │   └── embedding_service.py
│   ├── storage/
│   │   ├── raw_store.py          # Parquet read/write
│   │   ├── vector_store.py       # ChromaDB manager
│   │   └── insight_cache.py      # JSON insight persistence
│   ├── retrieval/
│   │   ├── retrieval_service.py
│   │   ├── chunker.py
│   │   └── chroma_retriever.py
│   ├── ai/
│   │   ├── prompts/
│   │   │   ├── qa_prompt.py
│   │   │   ├── theme_prompt.py
│   │   │   ├── segment_prompt.py
│   │   │   └── opportunity_prompt.py
│   │   ├── qa_service.py
│   │   ├── sentiment.py
│   │   ├── theme_extractor.py
│   │   ├── segment_classifier.py
│   │   ├── opportunity_detector.py
│   │   └── insight_generator.py
│   ├── pipeline/
│   │   ├── ingest_pipeline.py
│   │   ├── embed_pipeline.py
│   │   └── analysis_pipeline.py
│   └── export/
│       ├── csv_exporter.py
│       └── pdf_exporter.py
│
├── config/
│   ├── settings.py               # Env-based configuration
│   └── logging.py
│
├── data/
│   ├── sample/                   # Bundled demo datasets
│   │   ├── play_store_sample.csv
│   │   ├── app_store_sample.csv
│   │   └── reddit_sample.json
│   ├── processed/                # Cleaned Parquet files (gitignored)
│   ├── chroma/                   # ChromaDB persistence (gitignored)
│   ├── embeddings/               # Embedding cache (gitignored)
│   └── insights/                 # Generated insight JSON (gitignored)
│
├── tests/
│   ├── test_schemas.py
│   ├── test_ingestion.py
│   ├── test_vector_store.py
│   ├── test_qa_service.py
│   └── test_insights.py
│
├── Docs/
│   ├── problemstatement.md
│   └── plan/                     # This folder
│
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
└── .streamlit/
    └── config.toml
```

## Module Responsibilities

| Module | Owns | Must not own |
|--------|------|--------------|
| `app/` | UI rendering, session state, user interactions | Business logic, direct API calls |
| `src/ingestion/` | Raw data acquisition and cleaning | LLM calls, UI code |
| `src/embeddings/` | Text → vector encoding | Storage schema decisions |
| `src/storage/` | Persistence (Parquet, ChromaDB, JSON cache) | Analysis logic |
| `src/retrieval/` | Search and chunking | Prompt engineering |
| `src/ai/` | LLM prompts, analysis, insight generation | Streamlit components |
| `src/pipeline/` | Orchestration of multi-step jobs | Individual algorithm details |
| `src/export/` | Output formatting (CSV, PDF) | Dashboard rendering |
| `config/` | Environment and logging setup | Feature logic |

## Key Interfaces

### Pipeline orchestrator

```python
# src/pipeline/ingest_pipeline.py
def run_ingest_pipeline(source: str, file_path: str | None) -> str:
    """Returns dataset_id"""

# src/pipeline/embed_pipeline.py
def run_embed_pipeline(dataset_id: str) -> None:

# src/pipeline/analysis_pipeline.py
def run_analysis_pipeline(dataset_id: str) -> InsightReport:
```

### Services consumed by Streamlit

```python
# Called from app/pages/
insight_cache.load(dataset_id)           # → InsightReport
qa_service.ask(question, dataset_id)     # → QAResponse
export_service.to_csv(insights)          # → bytes
export_service.to_pdf(insights)          # → bytes
```

## Configuration (`config/settings.py`)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "spotify-review-engine/1.0"
    chroma_persist_dir: str = "./data/chroma"
    data_dir: str = "./data"
    embedding_model: str = "all-MiniLM-L6-v2"
    openai_model: str = "gpt-4o"
    top_k_retrieval: int = 20

    class Config:
        env_file = ".env"
```

## Dependencies (`requirements.txt`)

```
streamlit>=1.32.0
openai>=1.30.0
langchain>=0.2.0
langchain-openai>=0.1.0
langchain-community>=0.2.0
chromadb>=0.5.0
sentence-transformers>=2.7.0
pandas>=2.2.0
pyarrow>=16.0.0
pydantic>=2.7.0
pydantic-settings>=2.3.0
python-dotenv>=1.0.0
plotly>=5.22.0
praw>=7.7.0
fpdf2>=2.7.0
pytest>=8.2.0
```

## `.gitignore` essentials

```
.env
data/processed/
data/chroma/
data/embeddings/
data/insights/
__pycache__/
*.pyc
.venv/
```

## Streamlit Configuration

```toml
# .streamlit/config.toml
[theme]
base = "dark"
primaryColor = "#1DB954"
backgroundColor = "#121212"
secondaryBackgroundColor = "#181818"
textColor = "#FFFFFF"
font = "sans serif"

[server]
headless = true
```

## Development Workflow

```bash
# 1. Setup
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add OPENAI_API_KEY

# 2. Run pipelines (CLI)
python -m src.pipeline.ingest_pipeline --source csv --file data/sample/play_store_sample.csv
python -m src.pipeline.embed_pipeline --dataset-id <id>
python -m src.pipeline.analysis_pipeline --dataset-id <id>

# 3. Run app
streamlit run app/main.py

# 4. Test
pytest tests/ -v
```

## Phase-to-Folder Mapping

| Phase | Primary folders created |
|-------|-------------------------|
| 0 | `app/`, `config/`, `src/models/`, `data/sample/` |
| 1 | `src/ingestion/`, `src/storage/raw_store.py` |
| 2 | `src/embeddings/`, `src/storage/vector_store.py`, `src/pipeline/embed_pipeline.py` |
| 3 | `src/retrieval/`, `src/ai/qa_service.py`, `src/ai/prompts/` |
| 4 | `src/ai/*`, `src/pipeline/analysis_pipeline.py`, `src/storage/insight_cache.py` |
| 5 | `app/pages/`, `app/components/`, `app/styles/` |
| 6 | `src/export/`, `.streamlit/`, `Docs/deployment.md` |
