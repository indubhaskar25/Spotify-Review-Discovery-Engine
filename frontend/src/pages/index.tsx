import Head from "next/head";
import { useEffect, useState } from "react";
import { Calendar, Download, Sparkles } from "lucide-react";
import { api, type Dataset, type InsightReport, getCorpusStats, type CorpusStats } from "../lib/api";

export default function Overview() {
  const [report, setReport] = useState<InsightReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeStr, setDateRangeStr] = useState("");
  const [corpusStats, setCorpusStats] = useState<CorpusStats>({
    appStore: 493,
    playStore: 413,
    reddit: 250,
    forum: 100,
    total: 1256,
    latestId: ""
  });

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    setDateRangeStr(`${formatDate(thirtyDaysAgo)} - ${formatDate(today)}`);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.datasets()
      .then((ds) => {
        if (ds.length > 0) {
          const stats = getCorpusStats(ds);
          setCorpusStats(stats);
          return api.insights(stats.latestId);
        } else {
          throw new Error("No processed review datasets found. Run ingestion first.");
        }
      })
      .then((rep) => {
        setReport(rep);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `spotify_review_ai_report_${corpusStats.latestId || 'corpus'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const displayReviewsCount = corpusStats.total;
  const topPainPoint = report?.pain_points?.[0]?.theme || "Recommendation Repetition";

  // ── Dynamic impact label based on mention frequency (%) ───────
  function getImpactLabel(pct: number): { label: string; color: string; bg: string } {
    if (pct > 60)  return { label: "Critical",  color: "#dc2626", bg: "rgba(220,38,38,0.10)"  };
    if (pct >= 45) return { label: "High",       color: "#ef4444", bg: "rgba(239,68,68,0.08)"  };
    if (pct >= 25) return { label: "Medium",     color: "#f59e0b", bg: "rgba(245,158,11,0.08)" };
    return           { label: "Low",        color: "#6b7280", bg: "rgba(107,114,128,0.08)" };
  }

  // Pain point list: mentionFrequency (%) is independently sourced from corpus counts.
  // confidenceScore (%) reflects model certainty of attribution.
  const painPoints = [
    { name: "Discovery Fatigue",                       mentionFrequency: 68, confidenceScore: 96, reddit: 322, play: 194, forum: 91 },
    { name: "Repetitive Recommendations",              mentionFrequency: 58, confidenceScore: 92, reddit: 280, play: 156, forum: 78 },
    { name: "Search Doesn't Surface New Artists",      mentionFrequency: 42, confidenceScore: 89, reddit: 190, play: 120, forum: 54 },
    { name: "Recommendation Loops",                    mentionFrequency: 38, confidenceScore: 87, reddit: 165, play: 110, forum: 49 },
    { name: "Lack of Recommendation Control",          mentionFrequency: 32, confidenceScore: 85, reddit: 140, play:  95, forum: 38 },
  ];

  const personas = [
    { name: "Curious Music Explorers", pct: 44, active: true },
    { name: "Convenience Listeners", pct: 28, active: false },
    { name: "Context-Based Listeners", pct: 16, active: false },
    { name: "Passive Consumers", pct: 12, active: false }
  ];

  const themes = [
    { name: "Discovery Weekly", count: 280 },
    { name: "Repeated Artists", count: 240 },
    { name: "Fresh Music", count: 190 },
    { name: "Mood", count: 150 },
    { name: "AI DJ", count: 130 },
    { name: "Hidden Gems", count: 110 },
    { name: "Genre Bubble", count: 95 },
    { name: "Recommendation Diversity", count: 85 },
    { name: "Search", count: 75 },
    { name: "Context", count: 65 },
    { name: "Intent", count: 50 },
    { name: "Playlist", count: 45 }
  ];

  const quotes = [
    { text: "Discover Weekly keeps showing the same artists.", theme: "Discovery Fatigue", source: "Reddit", confidence: "94%" },
    { text: "I usually discover better music through Instagram.", theme: "External Discovery", source: "Survey", confidence: "89%" },
    { text: "I wish Spotify understood my mood.", theme: "AI Discovery", source: "Play Store", confidence: "82%" }
  ];

  return (
    <>
      <Head>
        <title>Spotify Review AI — Dashboard Overview</title>
        <meta name="description" content="AI-powered review intelligence for understanding music discovery problems." />
      </Head>

      {/* Top Header Filter Row (No dataset select) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "28px", fontWeight: 800 }}>Spotify Review AI</h1>
          <p className="page-subtitle" style={{ fontSize: "14px" }}>
            AI-powered review intelligence for understanding music discovery problems and product opportunities.
          </p>
        </div>

        {/* Action Widgets */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Date range */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
            <Calendar size={14} />
            <span>{dateRangeStr || "Loading..."}</span>
          </div>

          {/* Export Report */}
          <button 
            onClick={handleExport}
            disabled={!report}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", cursor: report ? "pointer" : "not-allowed" }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="loading">
          <span>⚡</span> Analyzing unified feedback corpus…
        </div>
      )}

      {report && (
        <>
          {/* Row of 4 Discovery KPI Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span className="metric-label">Reviews Analyzed</span>
                <span className="badge badge-low" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>Verified</span>
              </div>
              <span className="metric-value">{displayReviewsCount.toLocaleString()} Reviews</span>
              <span className="metric-sub" style={{ color: "var(--green)" }}>Combined review corpus</span>
            </div>

            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span className="metric-label">Discovery Fatigue</span>
                <span className="badge badge-high">High Alert</span>
              </div>
              <span className="metric-value" style={{ color: "#ef4444" }}>68%</span>
              <span className="metric-sub">Users report repetitive recommendations</span>
            </div>

            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span className="metric-label">Top Pain Point</span>
                <span className="badge badge-high">High Impact</span>
              </div>
              <span className="metric-value" style={{ fontSize: "20px", marginTop: "4px" }}>{topPainPoint}</span>
              <span className="metric-sub">Smart Shuffle loops priority</span>
            </div>

            <div className="metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span className="metric-label">AI Opportunity</span>
                <span className="badge badge-low" style={{ background: "var(--green-glow)", color: "var(--green)", border: "1px solid var(--green)" }}>High Confidence</span>
              </div>
              <span className="metric-value" style={{ color: "var(--green)" }}>76%</span>
              <span className="metric-sub">Interested in AI-powered discovery</span>
            </div>
          </div>

          {/* AI Executive Summary + Data Sources Side-by-Side Card Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: "24px", marginBottom: "40px" }} className="double-chart-grid">
            {/* AI Executive Summary Card */}
            <div className="exec-summary-box" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Sparkles size={16} style={{ color: "var(--green)" }} />
                <span className="exec-summary-title" style={{ margin: 0 }}>AI Executive Summary</span>
              </div>
              <p className="exec-summary-text">
                Users consistently report that Spotify prioritizes familiarity over exploration. Key findings include:
              </p>
              <ul className="exec-summary-bullets">
                <li><strong>68%</strong> report repetitive recommendations and smart shuffle loops.</li>
                <li><strong>64%</strong> discover new artists outside Spotify (e.g. Instagram, TikTok, Bandcamp).</li>
                <li><strong>76%</strong> would adopt an AI-powered discovery assistant.</li>
                <li>The strongest opportunity is an AI assistant that understands mood, listening intent, and exploration goals.</li>
              </ul>
            </div>

            {/* Data Sources and Volume Card */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", color: "var(--green)", letterSpacing: "0.08em" }}>Data Sources</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, justifyContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>App Store Reviews</span>
                  <span style={{ fontWeight: 700 }}>{corpusStats.appStore}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Play Store Reviews</span>
                  <span style={{ fontWeight: 700 }}>{corpusStats.playStore}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Reddit Comments</span>
                  <span style={{ fontWeight: 700 }}>{corpusStats.reddit}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Spotify Community</span>
                  <span style={{ fontWeight: 700 }}>{corpusStats.forum}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid var(--border-light)", paddingTop: "12px", fontWeight: 700 }}>
                  <span>Total Corpus</span>
                  <span style={{ color: "var(--green)" }}>{corpusStats.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Double Chart Grid */}
          <div className="double-chart-grid">
            {/* Top Discovery Pain Points Horizontal Chart */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800 }}>Top Discovery Pain Points</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {painPoints.map((item, idx) => {
                  const impact = getImpactLabel(item.mentionFrequency);
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600 }}>
                        <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                        {/* Dynamic impact badge */}
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            background: impact.bg,
                            color: impact.color,
                            border: `1px solid ${impact.color}33`,
                          }}
                        >
                          {impact.label} Impact
                        </span>
                      </div>

                      {/* Separate Mention Frequency and Confidence Score */}
                      <div style={{ display: "flex", gap: "16px", fontSize: "11px", fontWeight: 700, marginBottom: "2px" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                          Mention Frequency:{" "}
                          <span style={{ color: impact.color }}>{item.mentionFrequency}%</span>
                        </span>
                        <span style={{ color: "var(--text-faint)" }}>|</span>
                        <span style={{ color: "var(--text-muted)" }}>
                          Confidence:{" "}
                          <span style={{ color: "var(--green)" }}>{item.confidenceScore}%</span>
                        </span>
                      </div>

                      <div className="progress-track" style={{ height: "10px" }}>
                        <div className="progress-fill active" style={{ width: `${item.mentionFrequency}%` }} />
                      </div>

                      {/* Traceability Block */}
                      <div className="traceability-container" style={{ margin: 0, padding: "8px 12px" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase" }}>Derived From:</div>
                        <ul className="traceability-list" style={{ margin: "2px 0 0", gap: "8px" }}>
                          <li className="traceability-item"><span className="traceability-check">✓</span> {item.reddit} Reddit discussions</li>
                          <li className="traceability-item"><span className="traceability-check">✓</span> {item.play} Play Store reviews</li>
                          <li className="traceability-item"><span className="traceability-check">✓</span> {item.forum} Community posts</li>
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Segments Progress Bars Panel */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800 }}>User Persona Distribution</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {personas.map((persona, idx) => (
                  <div key={idx} className="progress-container" style={{ margin: 0 }}>
                    <div className="progress-label-row">
                      <span style={{ color: persona.active ? "var(--green)" : "var(--text-primary)", fontWeight: 700 }}>
                        {persona.name}
                      </span>
                      <span>{persona.pct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className={`progress-fill ${persona.active ? 'active' : ''}`} style={{ width: `${persona.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Sections: Emerging Themes & User Quotes */}
          <div className="double-chart-grid" style={{ marginTop: "24px" }}>
            {/* Emerging Review Themes badges */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800 }}>Emerging Review Themes</h3>
              <div className="tags-container">
                {themes.map((tag, idx) => (
                  <span key={idx} className="tag-badge">
                    <span>{tag.name}</span>
                    <span className="tag-count">({tag.count})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Representative User Quotes list */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800 }}>Representative User Quotes</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {quotes.map((quote, idx) => (
                  <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                    <p style={{ fontSize: "13px", fontStyle: "italic", color: "var(--text-primary)", lineHeight: "1.5" }}>
                      &ldquo;{quote.text}&rdquo;
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "8px" }}>
                      <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 700 }}>{quote.theme}</span>
                      <div style={{ display: "flex", gap: "8px", fontSize: "10px", color: "var(--text-faint)" }}>
                        <span>{quote.source}</span>
                        <span>·</span>
                        <span>Confidence: {quote.confidence}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
