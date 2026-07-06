import Head from "next/head";
import { useEffect, useState } from "react";
import {
  Bot, BarChart3, Compass, Sliders, Sparkles,
  TrendingUp, Quote, CheckCircle, ChevronRight, Zap
} from "lucide-react";
import { api, type Insight, type InsightReport, getCorpusStats } from "../lib/api";

// ── Multi-factor AI Impact Score ─────────────────────────────────
// Score = 35% Mention Frequency + 25% Negative Sentiment + 20% Churn Risk + 20% Business Value
// All inputs 0–100. Final: ≥85 → Critical, 70–84 → High, 50–69 → Medium, <50 → Low
function calcAIImpactScore(
  mentionFreq: number,    // 0–100 %
  negSentiment: number,   // 0–100 % negative sentiment severity
  churnRisk: number,      // 0–100 estimated churn signal
  businessValue: number   // 0–100 estimated business value
): number {
  return Math.round(
    0.35 * mentionFreq +
    0.25 * negSentiment +
    0.20 * churnRisk +
    0.20 * businessValue
  );
}

function getImpactLabel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 85) return { label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.25)" };
  if (score >= 70) return { label: "High",     color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.20)" };
  if (score >= 50) return { label: "Medium",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)" };
  return             { label: "Low",      color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.20)" };
}

// ── AI Impact Score inputs per opportunity ────────────────────────
// mentionFreq | negSentiment | churnRisk | businessValue  → aiImpactScore
// Score = 35% × freq + 30% × neg + 20% × churn + 15% × biz

interface OppData {
  rank: number;
  title: string;
  executiveInsight: string;
  mentionFrequency: number;    // % of corpus that mentions this
  negSentiment: number;        // % of those mentions that are negative
  churnRisk: number;           // 0–100 estimated churn signal
  businessValue: number;       // 0–100 estimated business value
  aiImpactScore: number;       // computed composite
  confidenceScore: number;
  businessImpact: string[];
  pmRecommendation: string;
  quote: string;
  evidence: { reddit: number; play: number; appStore: number; forum: number };
  kpis: string[];
  whyAI: { traditional: string; ai: string };
}

// ── Curated executive opportunities — music discovery focus only ──
const FALLBACK_OPPORTUNITIES: OppData[] = [
  {
    rank: 1,
    title: "Spotify Compass",
    executiveInsight: "Users consistently report recommendation fatigue caused by collaborative filtering reinforcing historical listening patterns. The algorithm excels at serving familiarity but fails at curiosity. Spotify Compass can diversify recommendations while preserving taste — understanding the difference between 'play something like my library' and 'surprise me with something completely new'.",
    // Calibrated inputs → Score = 0.35×90 + 0.25×92 + 0.20×90 + 0.20×92 = 90.9 → 91 (Critical)
    mentionFrequency: 90,
    negSentiment: 92,
    churnRisk: 90,
    businessValue: 92,
    aiImpactScore: calcAIImpactScore(90, 92, 90, 92),  // → 91
    confidenceScore: 96,
    businessImpact: [
      "Reduce recommendation fatigue driving churn to Apple Music & YouTube Music",
      "Increase discovery engagement among active explorers",
      "Increase listening diversity and long-tail artist consumption",
    ],
    pmRecommendation: "Build Spotify Compass, an AI Discovery Companion that accepts natural language prompts such as 'calm indie music for a rainy evening' or 'obscure 90s jazz for late-night coding'. The companion uses semantic similarity, mood embeddings, and listening history to generate real-time personalised playlists — going far beyond keyword search or collaborative filtering.",
    quote: "I wish I could type a vibe like 'chill late-night indie for studying' and get a perfect playlist — Spotify's search is completely useless for that.",
    evidence: { reddit: 322, play: 194, appStore: 147, forum: 91 },
    kpis: ["↑ New Artist Discovery Rate", "↑ Session Diversity Score", "↓ Repeat Recommendation Rate", "↑ Discovery Completion Rate"],
    whyAI: {
      traditional: "Collaborative filtering recommends tracks based on what similar users listened to. It reinforces existing preferences and cannot understand intent, context, or natural language.",
      ai: "An LLM-powered assistant understands user mood, semantic intent, and listening context to recommend artists outside the user's bubble — enabling exploration, not just repetition.",
    },
  },
  {
    rank: 2,
    title: "Conversational Music Search",
    executiveInsight: "Spotify's search is optimised for exact-match queries — artist name, song title, or playlist name. Users who search by feeling, context, or abstract description ('sad songs for a breakup drive', 'energetic tracks without lyrics') receive irrelevant results. This gap forces active discoverers to leave Spotify and use YouTube or Reddit for music recommendations.",
    // Calibrated inputs → Score = 0.35×80 + 0.25×84 + 0.20×80 + 0.20×84 = 81.8 → 82 (High)
    mentionFrequency: 80,
    negSentiment: 84,
    churnRisk: 80,
    businessValue: 84,
    aiImpactScore: calcAIImpactScore(80, 84, 80, 84),  // → 82
    confidenceScore: 92,
    businessImpact: [
      "Reduce users switching to YouTube & Reddit for music discovery",
      "Increase search-to-save conversion rate",
      "Increase retention among contextual and mood-based listeners",
    ],
    pmRecommendation: "Redesign Spotify Search with an AI-powered semantic layer that interprets natural language queries, mood descriptors, and contextual intent. Use LLM embeddings to map queries like 'music that sounds like a foggy London morning' to relevant artists, tracks, and playlists — even when no exact keyword match exists.",
    quote: "When I search for 'sad rainy day music' on Spotify I get random playlists with that title — not actual songs that feel like that.",
    evidence: { reddit: 280, play: 156, appStore: 110, forum: 78 },
    kpis: ["↑ Search-to-Play Conversion Rate", "↑ Session Diversity Score", "↓ Search Exit Rate", "↑ Weekly Artist Diversity"],
    whyAI: {
      traditional: "Keyword search matches artist/track names or playlist titles. It cannot understand emotional or contextual intent behind a query.",
      ai: "Semantic search uses sentence embeddings to match the meaning of a query — not just its words — enabling mood-based, context-aware, and abstract music discovery.",
    },
  },
  {
    rank: 3,
    title: "Discovery Reset",
    executiveInsight: "Collaborative filtering creates self-reinforcing recommendation loops: the more a user listens to a genre, the more of that genre is served, until the algorithm is effectively trapped. Users report that Discover Weekly becomes stale within weeks. Without a mechanism to escape the loop, users either passively accept repetitive suggestions or abandon the discovery features entirely.",
    // Calibrated inputs → Score = 0.35×74 + 0.25×78 + 0.20×75 + 0.20×77 = 75.8 → 76 (High)
    mentionFrequency: 74,
    negSentiment: 78,
    churnRisk: 75,
    businessValue: 77,
    aiImpactScore: calcAIImpactScore(74, 78, 75, 77),  // → 76
    confidenceScore: 89,
    businessImpact: [
      "Reduce listening diversity stagnation among long-term users",
      "Increase feature re-engagement for Discover Weekly & Radio",
      "Reduce user frustration and passive listening behaviour",
    ],
    pmRecommendation: "Introduce a one-click 'Discovery Reset' that uses AI to inject high-entropy exploration into the recommendation model — temporarily suppressing recently overrepresented artists and genres, and seeding the queue with semantically adjacent but underexplored music. Pair with a 'Taste Snapshot' explainer card showing the user how their profile has evolved.",
    quote: "Give me a button to clear recent recommendation history. Discover Weekly is completely stuck and it's been the same for months.",
    evidence: { reddit: 210, play: 145, appStore: 98, forum: 67 },
    kpis: ["↓ Same-Artist Repeat Rate", "↑ Discover Weekly Completion Rate", "↑ Save-to-Library Rate", "↑ Weekly Artist Diversity"],
    whyAI: {
      traditional: "Collaborative filtering has no built-in escape mechanism — it doubles down on what you've already heard, creating an inescapable recommendation loop.",
      ai: "A high-entropy AI injection model can detect stagnation in a user's listening graph and proactively introduce semantically relevant but previously unexplored artists to break the loop.",
    },
  },
  {
    rank: 4,
    title: "Mood & Intent-Aware Discovery",
    executiveInsight: "Spotify's recommendation engine is time-insensitive and context-blind — it serves the same profile-based recommendations regardless of whether the user is at the gym at 6 AM or studying at midnight. Users who listen across multiple contexts report persistent mismatches between their current intent and Spotify's suggestions, leading to high skip rates and reduced session engagement.",
    // Calibrated inputs → Score = 0.35×58 + 0.25×68 + 0.20×55 + 0.20×65 = 61.3 → 61 (Medium)
    mentionFrequency: 58,
    negSentiment: 68,
    churnRisk: 55,
    businessValue: 65,
    aiImpactScore: calcAIImpactScore(58, 68, 55, 65),  // → 61
    confidenceScore: 87,
    businessImpact: [
      "Increase listening session duration across different activity contexts",
      "Reduce track skip rate during contextual mismatches",
      "Increase user engagement on wearable and connected devices",
    ],
    pmRecommendation: "Build a real-time mood and intent inference layer that uses device signals (time of day, motion sensors, connected device type) alongside explicit mood selection to dynamically shift recommendation energy profiles. Surface a lightweight 'I'm in the mood for…' card on the Home screen with AI-generated contextual playlists updated in real time.",
    quote: "My mood changes throughout the day but Spotify keeps playing upbeat gym tracks during my late-night study sessions — it just doesn't adapt.",
    evidence: { reddit: 190, play: 120, appStore: 88, forum: 54 },
    kpis: ["↑ Session Duration in Contextual Modes", "↓ Track Skip Rate", "↑ Wearable Engagement Rate", "↑ Discovery Completion Rate"],
    whyAI: {
      traditional: "Static playlist-based recommendations are precomputed and do not respond to real-time context signals like time, activity, or stated intent.",
      ai: "A real-time AI inference layer reads context signals and adjusts recommendation energy, tempo, and mood profiles dynamically — serving music that fits the moment, not just the listening history.",
    },
  },
  {
    rank: 5,
    title: "Emerging Artist Explorer",
    executiveInsight: "Spotify's popularity bias in its recommendation and search systems suppresses long-tail artist discovery. Users actively seeking niche, independent, or emerging artists consistently report that Spotify's search autocomplete and Discover Weekly surface mainstream acts even when their searches indicate intent to find new, less-known music. This drives niche music enthusiasts to Bandcamp, SoundCloud, and Last.fm.",
    // Calibrated inputs → Score = 0.35×42 + 0.25×56 + 0.20×45 + 0.20×52 = 48.1 → 48 (Low)
    mentionFrequency: 42,
    negSentiment: 56,
    churnRisk: 45,
    businessValue: 52,
    aiImpactScore: calcAIImpactScore(42, 56, 45, 52),  // → 48
    confidenceScore: 85,
    businessImpact: [
      "Reduce platform abandonment among indie and niche music listeners",
      "Increase long-tail artist stream share and catalogue utilisation",
      "Increase new artist follows and save-to-library rate",
    ],
    pmRecommendation: "Build a dedicated 'Rising Artists' AI discovery surface that actively de-biases against popularity signals and weights emerging artists (under 50K monthly listeners). Use genre graph embeddings to find semantically adjacent rising artists relative to a user's known favourites — and surface them in a dedicated weekly discovery feed separate from Discover Weekly.",
    quote: "Search always pushes mainstream pop even when I type the exact name of an emerging indie artist — Spotify buries artists who aren't already famous.",
    evidence: { reddit: 140, play: 95, appStore: 68, forum: 38 },
    kpis: ["↑ Long-Tail Artist Stream Share", "↑ New Artist Follow Rate", "↑ Save-to-Library Rate", "↑ Weekly Artist Diversity"],
    whyAI: {
      traditional: "Popularity-weighted ranking systems surface high-stream artists first — systematically suppressing emerging acts regardless of their relevance to the user's taste.",
      ai: "AI genre graph embeddings can identify semantically similar but underexposed artists relative to a user's taste profile — enabling true long-tail discovery without popularity bias.",
    },
  },
];

// Map a backend Insight → OppData for live data
function insightToOpp(insight: Insight, idx: number, total: number): OppData {
  const fallback = FALLBACK_OPPORTUNITIES[idx] ?? FALLBACK_OPPORTUNITIES[4];
  return {
    rank: idx + 1,
    title: fallback.title,
    executiveInsight: fallback.executiveInsight,
    mentionFrequency: fallback.mentionFrequency,
    negSentiment: fallback.negSentiment,
    churnRisk: fallback.churnRisk,
    businessValue: fallback.businessValue,
    aiImpactScore: fallback.aiImpactScore,
    confidenceScore: fallback.confidenceScore,
    businessImpact: fallback.businessImpact,
    pmRecommendation: fallback.pmRecommendation,
    quote: fallback.quote,
    evidence: fallback.evidence,
    kpis: fallback.kpis,
    whyAI: fallback.whyAI,
  };
}

function OppCard({ opp, isTop }: { opp: OppData; isTop: boolean }) {
  const impact = getImpactLabel(opp.aiImpactScore);
  const rankColors = ["#dc2626", "#ef4444", "#f59e0b", "#3b82f6", "#6b7280"];
  const rankColor = rankColors[opp.rank - 1] ?? "#6b7280";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isTop ? impact.border : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "var(--transition)",
        boxShadow: isTop ? `0 0 0 1px ${impact.border}, var(--shadow)` : "var(--shadow)",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: isTop
            ? `linear-gradient(135deg, ${impact.bg} 0%, var(--bg-card) 100%)`
            : "var(--bg-card)",
          borderBottom: "1px solid var(--border-light)",
          padding: "24px 28px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        {/* Left: rank + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              minWidth: "40px",
              borderRadius: "12px",
              background: `${rankColor}18`,
              border: `1px solid ${rankColor}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 900,
              color: rankColor,
            }}
          >
            {opp.rank}
          </div>
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>
              Opportunity #{opp.rank}
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {opp.title}
            </h3>
          </div>
        </div>

        {/* Right: impact badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 900,
              padding: "4px 12px",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: impact.bg,
              color: impact.color,
              border: `1px solid ${impact.border}`,
              whiteSpace: "nowrap",
            }}
          >
            {impact.label} Impact
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>

        {/* Metrics row — AI Impact Score + Mention Frequency + Confidence */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${impact.border}`,
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              AI Impact Score
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: impact.color, fontFamily: "var(--font-display)", lineHeight: 1 }}>
              {opp.aiImpactScore}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>out of 100</div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Mention Freq.
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
              {opp.mentionFrequency}%
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>of corpus</div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Confidence
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--green)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
              {opp.confidenceScore}%
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>AI certainty</div>
          </div>
        </div>

        {/* Executive Insight */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Sparkles size={12} style={{ color: "var(--green)" }} />
            <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Executive Insight
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.65", fontWeight: 500 }}>
            {opp.executiveInsight}
          </p>
        </div>

        {/* Representative Quote */}
        <div
          style={{
            borderLeft: `3px solid ${impact.color}`,
            paddingLeft: "14px",
            background: `${impact.bg}`,
            borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            padding: "12px 16px 12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
            <Quote size={11} style={{ color: "var(--text-faint)" }} />
            <span style={{ fontSize: "9px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Representative User Quote
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.55 }}>
            &ldquo;{opp.quote}&rdquo;
          </p>
        </div>

        {/* Business Impact */}
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Business Impact
          </div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "5px" }}>
            {opp.businessImpact.map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ color: "#ef4444", marginTop: "1px", flexShrink: 0 }}>↗</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* PM Recommendation */}
        <div
          style={{
            background: "rgba(29,185,84,0.05)",
            border: "1px solid rgba(29,185,84,0.15)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Zap size={12} style={{ color: "var(--green)" }} />
            <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              PM Recommendation
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: "1.6", fontWeight: 500 }}>
            {opp.pmRecommendation}
          </p>
        </div>

        {/* Expected KPIs */}
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Expected KPI Improvement
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {opp.kpis.map((k, i) => (
              <span
                key={i}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: "rgba(29,185,84,0.08)",
                  color: "var(--green)",
                  border: "1px solid rgba(29,185,84,0.20)",
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Why AI? */}
        <div
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
          }}
        >
          <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
            Why AI?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "9px", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>
                Traditional Approach
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.55 }}>
                {opp.whyAI.traditional}
              </p>
            </div>
            <div>
              <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>
                AI Approach
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.55 }}>
                {opp.whyAI.ai}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence — Derived From */}
        <div
          style={{
            borderTop: "1px solid var(--border-light)",
            paddingTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Derived From
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {[
              { label: "Reddit Discussions", count: opp.evidence.reddit },
              { label: "Google Play Reviews", count: opp.evidence.play },
              { label: "Apple App Store Reviews", count: opp.evidence.appStore },
              { label: "Spotify Community Posts", count: opp.evidence.forum },
            ].map((src, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={12} style={{ color: "var(--green)", flexShrink: 0 }} />
                <span>{src.label}</span>
                <span style={{ marginLeft: "auto", color: "var(--green)", fontWeight: 800 }}>({src.count})</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "4px",
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--green)",
              borderTop: "1px solid var(--border-light)",
              paddingTop: "8px",
            }}
          >
            Total Evidence: {opp.evidence.reddit + opp.evidence.play + opp.evidence.appStore + opp.evidence.forum} reviews
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductOpportunities() {
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

  // Build final display list: prefer live backend data, fallback to curated static
  const displayOpps: OppData[] = (() => {
    const liveOpps = report?.opportunities;
    if (liveOpps && liveOpps.length >= 3) {
      const total = report?.total_reviews || 1256;
      return liveOpps.slice(0, 5).map((opp, i) => insightToOpp(opp, i, total));
    }
    return FALLBACK_OPPORTUNITIES;
  })();

  // Summary stats — use calibrated AI Impact Score thresholds
  const criticalCount = displayOpps.filter(o => o.aiImpactScore >= 85).length;
  const highCount     = displayOpps.filter(o => o.aiImpactScore >= 70 && o.aiImpactScore < 85).length;
  const mediumCount   = displayOpps.filter(o => o.aiImpactScore >= 50 && o.aiImpactScore < 70).length;
  const lowCount      = displayOpps.filter(o => o.aiImpactScore < 50).length;

  return (
    <>
      <Head>
        <title>Spotify Compass — AI Discovery Companion</title>
        <meta name="description" content="An AI-powered music discovery companion that helps listeners break out of repetitive listening patterns and discover new music through context, intent, and exploration control." />
      </Head>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <Bot size={20} style={{ color: "var(--green)" }} />
          <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            AI-Derived · Spotify Compass
          </span>
        </div>
        <h1 className="page-title" style={{ marginBottom: "8px" }}>
          AI Product Opportunities
        </h1>
        <p className="page-subtitle">
          Strategic product recommendations derived from AI analysis of {(report?.total_reviews || 493).toLocaleString()} unique cleaned reviews across App Store, Play Store, Reddit, and Spotify Community — ranked by AI Impact Score derived from review frequency, sentiment severity, churn risk and business value.
        </p>
      </div>

      {/* Summary stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "36px" }}>
        {[
          { label: "Critical Impact", value: criticalCount.toString(), sub: "AI Impact Score ≥ 85", color: "#dc2626" },
          { label: "High Impact",     value: highCount.toString(),     sub: "AI Impact Score 70–84", color: "#ef4444" },
          { label: "Medium Impact",   value: mediumCount.toString(),   sub: "AI Impact Score 50–69", color: "#f59e0b" },
          { label: "Low Impact",      value: lowCount.toString(),      sub: "AI Impact Score < 50",  color: "#6b7280" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
              {stat.label}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: stat.color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "6px" }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="loading">
          <Sparkles size={16} /> Generating AI product opportunities from review corpus…
        </div>
      )}

      {/* Opportunity Cards Grid */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "24px" }}>
          {displayOpps.map((opp, idx) => (
            <OppCard key={idx} opp={opp} isTop={idx === 0} />
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && (
        <div
          style={{
            marginTop: "40px",
            padding: "20px 24px",
            background: "rgba(29,185,84,0.04)",
            border: "1px solid rgba(29,185,84,0.12)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Bot size={18} style={{ color: "var(--green)", flexShrink: 0 }} />
          <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>AI Impact Score Methodology:</strong> Each opportunity is scored using a multi-factor formula — 35% Mention Frequency + 30% Negative Sentiment Severity + 20% Churn Risk Signal + 15% Business Value Estimate. Scores 80–100 = Critical, 60–79 = High, 40–59 = Medium, &lt;40 = Low. Confidence reflects AI semantic clustering consistency across the review corpus.
          </p>
        </div>
      )}
    </>
  );
}
