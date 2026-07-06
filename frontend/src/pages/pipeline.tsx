import Head from "next/head";

export default function Pipeline() {
  return (
    <>
      <Head>
        <title>Spotify Compass — AI Discovery Companion</title>
      </Head>

      <div className="page-header">
        <h1 className="page-title">Review Analysis Data Pipeline</h1>
        <p className="page-subtitle">Visual overview of data flow from multi-source review ingestion to strategic product opportunities.</p>
      </div>

      <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 className="section-title" style={{ textAlign: "center", marginBottom: "32px" }}>E2E Ingestion & Extraction Workflow</h2>
        
        <div className="pipeline-flow">
          {/* Data Sources Row */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <div className="pipeline-node ingest">📱 App Store</div>
            <div className="pipeline-node ingest">🤖 Play Store</div>
            <div className="pipeline-node ingest">👽 Reddit Thread</div>
            <div className="pipeline-node ingest">💬 Spotify Forum</div>
          </div>

          <div className="pipeline-arrow">↓</div>

          {/* Cleaning */}
          <div className="pipeline-node clean">🧹 Data Cleaning & Normalization</div>
          <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "-16px" }}>
            Strips HTML, removes duplicates, filters noise & spam, standardizes ratings
          </p>

          <div className="pipeline-arrow">↓</div>

          {/* Embeddings */}
          <div className="pipeline-node embed">🔤 Embedding Generation</div>
          <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "-16px" }}>
            Encodes texts into 384-dimensional dense vectors using Sentence Transformers (all-MiniLM-L6-v2)
          </p>

          <div className="pipeline-arrow">↓</div>

          {/* ChromaDB */}
          <div className="pipeline-node embed" style={{ borderLeftColor: "#9932cc" }}>📦 ChromaDB Vector Store</div>
          <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "-16px" }}>
            Stores vectorized reviews indexed by dataset ID for sub-millisecond semantic lookup
          </p>

          <div className="pipeline-arrow">↓</div>

          {/* Semantic Retrieval */}
          <div className="pipeline-node embed" style={{ borderLeftColor: "#9932cc" }}>🔍 Semantic Retrieval (RAG)</div>
          <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "-16px" }}>
            Filters vector collections by metadata (rating, platform) and queries matching context
          </p>

          <div className="pipeline-arrow">↓</div>

          {/* Groq LLM */}
          <div className="pipeline-node groq">🤖 Groq LLM Inference</div>
          <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "-16px" }}>
            Drafts cited answers and extracts themes via llama-3.3-70b-versatile
          </p>

          <div className="pipeline-arrow">↓</div>

          {/* Strategic Outputs */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <div className="pipeline-node output">🚨 Top Pain Points</div>
            <div className="pipeline-node output">👥 Persona Segments</div>
            <div className="pipeline-node output">💡 Product Opportunities</div>
          </div>
        </div>
      </div>
    </>
  );
}
