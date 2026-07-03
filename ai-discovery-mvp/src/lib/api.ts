export interface Dataset {
  dataset_id: string;
  record_count: number;
  saved_at: string;
  has_insights: boolean;
}

export interface ReviewSearchResult {
  id: string;
  document: string;
  metadata: {
    source: string;
    rating: number;
    author: string;
    title: string;
    [key: string]: any;
  };
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

export const backendApi = {
  getDatasets: async (): Promise<Dataset[]> => {
    try {
      const data = await apiFetch<{ datasets: Dataset[] }>("/api/datasets");
      return data.datasets || [];
    } catch (err) {
      console.error("Failed to fetch datasets from backend:", err);
      throw err;
    }
  },
  
  searchReviews: async (
    query: string,
    datasetId: string,
    topK: number = 10
  ): Promise<ReviewSearchResult[]> => {
    return apiFetch<ReviewSearchResult[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        dataset_id: datasetId,
        top_k: topK,
      }),
    });
  },
};
