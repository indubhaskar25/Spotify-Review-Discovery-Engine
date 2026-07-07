import Head from "next/head";
import { useEffect, useState } from "react";
import { Users, Smile, Compass, Target, HelpCircle, AlertTriangle } from "lucide-react";
import { api, type Dataset, type InsightReport, getCorpusStats } from "../lib/api";

export default function UserSegments() {
  const [report, setReport] = useState<InsightReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.datasets().then((ds) => {
      if (ds.length > 0) {
        const stats = getCorpusStats(ds);
        return api.insights(stats.latestId);
      } else {
        throw new Error("No datasets found.");
      }
    })
    .then(setReport)
    .catch((e) => setError(String(e)))
    .finally(() => setLoading(false));
  }, []);

  const personas = [
    {
      name: "Curious Music Explorers",
      pct: 44,
      reviewsCount: 527,
      needs: ["Niche genre discovery", "Indie artist surfacing", "Interactive filtering controls"],
      painPoints: ["Recommendation loops", "Familiarity bias", "Smart Shuffle repeats same 20 tracks"],
      goals: ["Find emerging hidden gems", "Create diverse genre-spanning playlists", "Expand music taste profile"],
      quote: "Discover Weekly keeps pushing mainstream stuff. I want to search and find unique indie bands.",
      highlight: true
    },
    {
      name: "Convenience Listeners",
      pct: 28,
      reviewsCount: 335,
      needs: ["Low-friction startup", "Reliable automated playlists", "Easy background music stream"],
      painPoints: ["Sudden recommendation shifts", "Algorithm fatigue when shuffle fails", "Irrelevant recommendations in daily mixes"],
      goals: ["Start listening in under 2 clicks", "Consistent mood matching", "Simple curation-free experience"],
      quote: "I just want background music while working. Smart Shuffle keeps breaking my flow with weird track selections.",
      highlight: false
    },
    {
      name: "Context-Based Listeners",
      pct: 16,
      reviewsCount: 191,
      needs: ["Contextual tagging (chill, gym, focus)", "Mood-based playlists", "Local time/activity integration"],
      painPoints: ["Static algorithm mixes that ignore time of day", "Unable to customize discovery based on mood", "Workout tracks showing up in sleep playlists"],
      goals: ["Match music to current physical activity", "Quick context adjustment", "Dynamic playlists adapt to real-time inputs"],
      quote: "My mixes show gym music during late night study sessions. Spotify doesn't adapt to my daily context.",
      highlight: false
    },
    {
      name: "Passive Consumers",
      pct: 12,
      reviewsCount: 144,
      needs: ["Popular hits", "Lean-back passive listening", "High radio consistency"],
      painPoints: ["Radio recommendations stray too far from seed track", "Hard to find mainstream global charts", "Too many complex discovery choices"],
      goals: ["Listen to trending chart toppers", "Reliable and predictable playback", "Minimize UI interaction time"],
      quote: "I just want the charts. The discovery tools are too complex when I just want to hear what is popular.",
      highlight: false
    }
  ];

  return (
    <>
      <Head>
        <title>User Segments — Spotify Review Insights</title>
      </Head>

      <div className="page-header">
        <h1 className="page-title">User Segments & Personas</h1>
        <p className="page-subtitle">
          Granular classification of users into strategic groups based on discovery friction, needs, and exploration goals.
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="loading">
          <span>⌛</span> Classifying user segments matrix…
        </div>
      )}

      {report && (
        <div className="segment-cards-grid">
          {personas.map((seg, idx) => {
            return (
              <div
                key={idx}
                className="card segment-detail-card"
                style={{
                  border: seg.highlight ? "1.5px solid var(--green-border)" : "1px solid var(--border)",
                  background: seg.highlight ? "linear-gradient(135deg, rgba(29, 185, 84, 0.05) 0%, rgba(18, 18, 20, 0.2) 100%)" : "var(--bg-card)",
                  position: "relative"
                }}
              >
                {seg.highlight && (
                  <span
                    className="badge badge-mvp"
                    style={{
                      position: "absolute",
                      top: "20px",
                      right: "20px",
                      background: "var(--green-glow)",
                      color: "var(--green)",
                      border: "1px solid var(--green)"
                    }}
                  >
                    Primary Focus
                  </span>
                )}
                
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 800, color: seg.highlight ? "var(--green)" : "var(--text-primary)" }}>
                    {seg.name}
                  </h2>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600, display: "block", marginTop: "4px" }}>
                    {seg.pct}% of Audience · {seg.reviewsCount} reviews
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-faint)", marginBottom: "8px" }}>
                      <Compass size={14} />
                      <h4 style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>User Needs</h4>
                    </div>
                    <ul className="segment-bullets">
                      {seg.needs.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-faint)", marginBottom: "8px" }}>
                      <Target size={14} />
                      <h4 style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Goals</h4>
                    </div>
                    <ul className="segment-bullets">
                      {seg.goals.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-faint)", marginBottom: "8px" }}>
                    <AlertTriangle size={14} style={{ color: "#ef4444" }} />
                    <h4 style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Friction Pain Points</h4>
                  </div>
                  <ul className="segment-bullets">
                    {seg.painPoints.map((item: string, i: number) => (
                      <li key={i} style={{ color: "#ef4444" }}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase" }}>User Quote</span>
                  <div className="quote-box" style={{ fontSize: "12px", marginTop: "6px" }}>
                    &ldquo;{seg.quote}&rdquo;
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
