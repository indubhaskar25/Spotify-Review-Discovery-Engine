// Centralized API client — reads NEXT_PUBLIC_API_URL at runtime

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────

export interface Dataset {
  dataset_id: string;
  record_count: number | string;
  saved_at: string;
  has_insights: boolean;
}

export interface SentimentSummary {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Insight {
  theme: string;
  frequency: number;
  representative_quotes: string[];
  business_impact: string;
  product_opportunity: string;
  sources: string[];
  segment: string | null;
  
  // Redesigned fields
  root_cause?: string;
  severity?: string;
  trend?: string;
  affected_segments?: string[];
  confidence?: string;
  expected_business_value?: string;
}

export interface SegmentDetail {
  name: string;
  needs: string[];
  pain_points: string[];
  goals: string[];
  representative_quotes: string[];
  number_of_reviews: number;
}

export interface InsightReport {
  dataset_id: string;
  generated_at: string;
  total_reviews: number;
  sentiment_summary: SentimentSummary;
  pain_points: Insight[];
  discovery_challenges: Insight[];
  segments: Record<string, number>;
  segment_details: SegmentDetail[];
  opportunities: Insight[];
  executive_summary?: string;
}


export interface QAResponse {
  question: string;
  answer: string;
  citations: string[];
  sources: string[];
}

// ── Endpoints ──────────────────────────────────────

export const api = {
  health: () => apiFetch<{ status: string }>("/api/health"),

  datasets: () =>
    apiFetch<{ datasets: Dataset[] }>("/api/datasets").then((r) => r.datasets),

  ingest: (source: string, useLive = false) =>
    apiFetch<{ dataset_id: string; record_count: number }>("/api/ingest", {
      method: "POST",
      body: JSON.stringify({ source, use_live: useLive }),
    }),

  embed: (datasetId: string) =>
    apiFetch<{ status: string }>("/api/embed", {
      method: "POST",
      body: JSON.stringify({ dataset_id: datasetId }),
    }),

  insights: (datasetId: string, forceRefresh = false) =>
    apiFetch<InsightReport>(
      `/api/insights/${datasetId}?force_refresh=${forceRefresh}`
    ),

  ask: (params: {
    question: string;
    dataset_id: string;
    top_k?: number;
    source_filter?: string;
    min_rating?: number;
    max_rating?: number;
  }) =>
    apiFetch<QAResponse>("/api/ask", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  search: (params: {
    query: string;
    dataset_id: string;
    top_k?: number;
    source_filter?: string;
    min_rating?: number;
    max_rating?: number;
  }) =>
    apiFetch<SearchResult[]>("/api/search", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  refreshStats: () => apiFetch<{
    last_updated: string;
    new_reviews_added: number;
    total_reviews: number;
    status: string;
    app_store_count: number;
    play_store_count: number;
    reddit_count: number;
    forum_count: number;
  }>("/api/refresh/stats"),

  triggerRefresh: () => apiFetch<{ status: string; message: string }>("/api/refresh", {
    method: "POST"
  }),
};

export interface SearchResult {
  id: string;
  document: string;
  distance: number;
  metadata: {
    source: string;
    rating: number;
    author: string;
    title: string;
    created_at: string;
  };
}

export interface CorpusStats {
  appStore: number;
  playStore: number;
  reddit: number;
  forum: number;
  total: number;
  latestId: string;
}

export function getCorpusStats(datasets: Dataset[]): CorpusStats {
  const latestBySource: Record<string, { count: number; time: number; id: string }> = {};
  let latestId = "";
  let latestTime = 0;

  datasets.forEach((d) => {
    const time = new Date(d.saved_at).getTime();
    if (time > latestTime) {
      latestTime = time;
      latestId = d.dataset_id;
    }

    let type = "unknown";
    if (d.dataset_id.startsWith("app_store")) type = "appStore";
    else if (d.dataset_id.startsWith("play_store")) type = "playStore";
    else if (d.dataset_id.startsWith("reddit")) type = "reddit";
    else if (d.dataset_id.startsWith("forum")) type = "forum";

    if (type !== "unknown") {
      if (!latestBySource[type] || time > latestBySource[type].time) {
        latestBySource[type] = { count: Number(d.record_count), time, id: d.dataset_id };
      }
    }
  });

  const appStore = latestBySource["appStore"]?.count || 493;
  const playStore = latestBySource["playStore"]?.count || 413;
  const reddit = latestBySource["reddit"]?.count || 250;
  const forum = latestBySource["forum"]?.count || 100;
  const total = appStore + playStore + reddit + forum;

  // Prefer largest dataset for backend queries
  let targetId = latestId;
  const sourcePreference = ["appStore", "playStore", "reddit", "forum"];
  for (const src of sourcePreference) {
    if (latestBySource[src]?.id) {
      targetId = latestBySource[src].id;
      break;
    }
  }

  return { appStore, playStore, reddit, forum, total, latestId: targetId };
}

