# Spotify AI Discovery Assistant MVP

This is a standalone, next-generation **Next.js AI Discovery Assistant** built to explore and analyze music discovery fatigue, emerging trends, and user pain points from Spotify reviews.

## Architecture

This application is built as a standalone Next.js App Router project inside the sub-folder `/ai-discovery-mvp`. It is designed to be independently deployable on Vercel without affecting the existing Review Analysis Engine.

* **Frontend UI:** Responsive, premium dark-mode dashboard matching Spotify's style, featuring glassmorphism elements, interactive mood tag filters, and an **Adventurousness Slider**.
* **Next.js Server API Route (`/api/chat`):** Resolves conversational queries. It makes a semantic search request to the FastAPI backend, retrieves the relevant review context, builds a context-aware system prompt (controlled by the slider and mood tags), and generates responses securely using Groq without exposing the API key to the client.
* **FastAPI Backend Integration:** Queries `/api/search` on the deployed Railway API to perform vector-based similarity search over reviews.

---

## Configuration & Environment Variables

Create a `.env.local` inside this directory (`/ai-discovery-mvp/.env.local`) or configure them on your Vercel deployment:

```env
# The URL of your deployed Railway FastAPI backend
NEXT_PUBLIC_API_URL=https://spotify-review-discovery-engine-production-9e36.up.railway.app

# Your Groq API Key (used on the server-side Next.js route)
GROQ_API_KEY=gsk_your_groq_api_key_here

# (Optional) Override default Groq model (defaults to llama-3.1-8b-instant)
GROQ_MODEL=llama-3.1-8b-instant
```

---

## Local Development

1. Navigate to the folder:
   ```bash
   cd ai-discovery-mvp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the AI Discovery Assistant.

---

## Deploying to Vercel

You can deploy this subdirectory directly on Vercel using the Vercel CLI or via GitHub integration:

1. Import this repository in Vercel.
2. Under **Project Settings**, set the **Root Directory** to `ai-discovery-mvp`.
3. Add the **Environment Variables**:
   * `NEXT_PUBLIC_API_URL`
   * `GROQ_API_KEY`
4. Click **Deploy**.
