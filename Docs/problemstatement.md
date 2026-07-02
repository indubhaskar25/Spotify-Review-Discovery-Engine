# Spotify Review Discovery Engine

## Problem Statement

Spotify receives thousands of reviews, Reddit discussions, and community posts every day. Product teams cannot manually analyze this feedback at scale, which makes it hard to identify recurring patterns in music discovery, recommendation quality, listening behavior, user segments, and unmet needs.

Without a structured way to surface these signals, teams risk missing high-impact product opportunities buried in unstructured user feedback.

## Objective

Build an AI-powered application that ingests Spotify-related user feedback from multiple sources, analyzes it semantically, and produces actionable product insights through an interactive dashboard.

## Key Questions the System Must Answer

- Why do users struggle to discover new music?
- What are the most common frustrations with recommendations?
- What drives repetitive listening behavior?
- Which user segments experience different discovery challenges?
- What unmet needs appear consistently across sources?

## Scope

### In Scope

**Data sources**

| Source | Notes |
|--------|-------|
| Google Play Store reviews | Spotify app reviews |
| Apple App Store reviews | Use sample dataset if live API access is unavailable |
| Reddit | r/spotify, r/truespotify, r/music |
| Spotify Community Forum | Public posts and discussions |

**Core capabilities**

- CSV upload for review datasets
- Data cleaning and normalization pipeline
- Embedding generation and vector storage
- Semantic search across all ingested feedback
- Theme extraction, sentiment analysis, and user segment identification
- Opportunity detection with AI-generated summaries
- Export of insights to CSV and PDF

**Dashboard sections**

| Section | Purpose |
|---------|---------|
| Review Overview | Total reviews analyzed; positive/negative sentiment distribution |
| Top Pain Points | Ranked list of recurring complaints by frequency |
| Discovery Challenges | Music discovery–specific issues and themes |
| User Segments | Playlist Loyalists, Passive Listeners, Active Explorers, Mood-Based Listeners |
| Opportunity Areas | High-frequency unmet needs and product improvement suggestions |

**Insight output format**

Every generated insight must include:

- Theme
- Frequency (or relative prominence)
- Representative user quotes
- Business impact
- Product opportunity

### Out of Scope

- Real-time streaming ingestion from all sources (batch/periodic collection is sufficient)
- Direct integration with Spotify internal analytics or proprietary user data
- Automated product ticket creation or workflow integrations
- Multi-language support beyond English (unless trivially supported by the model)

## Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Language | Python |
| Frontend | Streamlit |
| LLM | OpenAI GPT-4o |
| Orchestration | LangChain |
| Vector store | ChromaDB |
| Embeddings | Sentence Transformers |
| Data processing | Pandas |

### Pipeline

```
Data Collection
  → Data Cleaning & Normalization
  → Embedding Generation
  → Vector Database Storage
  → Retrieval Layer
  → GPT Analysis Layer
  → Insight Dashboard
```

### UI Requirements

- Clean, Spotify-inspired dark theme
- Minimal, focused dashboard layout
- Interactive charts for sentiment, themes, and segments
- Natural-language search interface for querying review data

## Deliverables

Production-ready codebase including:

- Clear folder structure and modular components
- `requirements.txt` with pinned dependencies
- Setup instructions and environment variable documentation (`.env` template)
- Sample or seed data for local development and demos
- Deployment guide for Streamlit Cloud

## Success Criteria

The project is complete when a user can:

1. Upload or load review data from at least one source
2. Run the analysis pipeline end-to-end without manual intervention
3. Explore insights across all five dashboard sections
4. Search reviews semantically and receive grounded, quote-backed answers
5. Export a summary of findings to CSV or PDF
6. Deploy the app to Streamlit Cloud following the provided instructions
