import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { backendApi } from "@/lib/api";
import { TRACKS } from "@/lib/catalog";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { messages, persona, adventurousness, moodTags } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1].content;

    // 1. Fetch search findings from Review Engine (Deliverable 1 connection)
    let reviewContext = "No specific database findings matched.";
    try {
      const searchResults = await backendApi.searchReviews(latestMessage, persona?.id || "general", 5);
      if (searchResults && searchResults.length > 0) {
        reviewContext = searchResults
          .map((r, i) => `Finding [${i + 1}] (from Review Database): ${r.document}`)
          .join("\n");
      }
    } catch (err) {
      console.warn("Failed to query reviews from Review Engine backend, using static database context.", err);
    }

    // 2. Format the catalog for the prompt (using prompt spec keys)
    const serializedCatalog = TRACKS.map(t => (
      `- id: ${t.id} | artist: ${t.artist} | title: "${t.title}" | genre: ${t.genre} | tempo: ${t.tempo} | mood_tags: ${t.mood_tags.join(", ")} | energy: ${t.energy} | era: ${t.era} | description: ${t.description}`
    )).join("\n");

    // 3. Formulate the system prompt
    const adventurousnessVal = adventurousness ?? 50;
    const selectedMoods = moodTags && moodTags.length > 0 ? moodTags : ["General"];
    
    // Listener Profile (exact spec keys)
    const listenerProfile = {
      frequently_replayed: persona?.frequently_replayed || "",
      frequently_skipped: persona?.frequently_skipped || "",
      typical_listening_context: persona?.typical_listening_context || "",
      rarely_explored_genres: persona?.rarely_explored_genres || [],
      recent_listening_patterns: persona?.recent_listening_patterns || ""
    };

    const systemPrompt = `You are "Spotify Compass" — Spotify's AI-powered Music Discovery Companion.
Tagline: "Find your next favorite song—not just another familiar one."

YOUR MISSION:
Help listeners discover music they would never have found through traditional recommendation algorithms. Unlike collaborative filtering, you understand a listener's mood, intent, context, exploration goals, and listening patterns to recommend meaningful discoveries instead of familiar repeats.

DISCOVERY INSIGHTS (Derived from the Part 1 Review Analysis Engine):
You must use these key findings from real user feedback to influence your music recommendations:
- Users complain that "Discover Weekly" repeatedly recommends the same artists. (Avoid recommending the persona's replay artists or mainstream-only acts).
- Users want contextual, mood-aligned recommendations. (Steer choices to fit the listener's exact context and mood tags).
- Users discover music outside Spotify (social media, films) because Spotify is too safe. (Recommend lesser-known "hidden gems" from the catalog).
- Users want clear, logical explanations of WHY a song fits their mood or context. (Explain the reasoning for each pick).

MUSIC CATALOG (Recommend exactly THREE tracks from this list. Do NOT invent tracks outside this list!):
${serializedCatalog}

LISTENER PROFILE (Current User Context):
- frequently_replayed: ${listenerProfile.frequently_replayed}
- frequently_skipped: ${listenerProfile.frequently_skipped}
- typical_listening_context: ${listenerProfile.typical_listening_context}
- rarely_explored_genres: ${listenerProfile.rarely_explored_genres.join(", ")}
- recent_listening_patterns: ${listenerProfile.recent_listening_patterns}

USER CONTROLS:
- Selected Mood/Vibe Tags: ${selectedMoods.join(", ")}
- Adventurousness level: ${adventurousnessVal}/100
  - If < 35 (Safe): Stay closer to familiar genres/styles in the catalog, but still recommend new artists.
  - If 35-70 (Balanced): Recommend a mix of genres, including some unexplored ones.
  - If > 70 (Adventurous): Recommend obscure tracks from unexplored genres (specifically target low popularity values).

OBJECTIVES:
1. Understand emotional intent rather than matching only genres.
2. Recommend exactly THREE tracks from the MUSIC CATALOG.
3. Balance familiarity with exploration. Recommendations should feel connected to the listener's taste while intentionally expanding beyond their listening bubble.
4. Prefer artists and genres that the listener rarely explores.
5. Avoid recommending anything that closely resembles their replay habits unless they explicitly request familiarity.
6. Use listening context (time of day, activity, mood, skipped patterns, replay behavior) when selecting tracks.
7. If the user rejects recommendations ("too familiar", "too slow", "not this vibe"), treat that as new preference data and adapt future recommendations accordingly.
8. Never explain recommendations using percentages or similarity scores. Instead, explain naturally why each recommendation fits this person's listening intent.

PERSONALITY:
- Friendly, Confident, Curious
- Feels like a music expert who knows the listener personally (never robotic)
- Keep the introduction under two short sentences.

OUTPUT FORMAT:
You MUST return STRICT JSON only. Do not wrap it in markdown backticks or include any introductory/concluding text outside the JSON. Start with '{' and end with '}'.

JSON Schema:
{
  "framing": "One short conversational sentence introducing the recommendations.",
  "reasoning": "One sentence explaining what changed compared with the listener's normal listening behavior.",
  "picks": [
    {
      "track_id": "Must match one of the track IDs from the MUSIC CATALOG",
      "artist": "Must match the artist of the picked track from the MUSIC CATALOG",
      "title": "Must match the title of the picked track from the MUSIC CATALOG",
      "reason": "Natural explanation referencing both the user's request and the listener profile."
    },
    {
      "track_id": "...",
      "artist": "...",
      "title": "...",
      "reason": "..."
    },
    {
      "track_id": "...",
      "artist": "...",
      "title": "...",
      "reason": "..."
    }
  ]
}`;

    // 4. Compile messages
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // 5. Call Groq
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    
    if (!process.env.GROQ_API_KEY) {
      // Mock fallback response for local development without API key
      const mockMatches = TRACKS.filter(t => 
        persona?.rarely_explored_genres?.includes(t.genre) || 
        t.vibe.some((v: string) => selectedMoods.map((sm: string) => sm.toLowerCase()).includes(v))
      ).slice(0, 3);
      
      const selectedRecs = mockMatches.length >= 3 ? mockMatches : TRACKS.slice(0, 3);
      const picks = selectedRecs.map(t => ({
        track_id: t.id,
        artist: t.artist,
        title: t.title,
        reason: `Compass matched this ${t.genre} gem because it perfectly aligns with your "${selectedMoods.join(", ")}" mood, bypassing your usual loop of ${listenerProfile.frequently_replayed}.`
      }));

      const mockResponse = {
        framing: `Here are three handpicked discoveries to help you explore outside your comfort zone.`,
        reasoning: `We bypassed your habit of repeating the same tracks by selecting atmospheric ${selectedRecs[0].genre} and ambient electronic pieces.`,
        picks
      };

      return NextResponse.json(mockResponse);
    }

    const completion = await groq.chat.completions.create({
      messages: apiMessages,
      model,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    
    // Parse to ensure it is valid JSON
    let parsedJson;
    try {
      parsedJson = JSON.parse(responseText.trim());
    } catch (parseErr) {
      console.warn("Failed to parse direct JSON from Groq, attempting regex extraction", parseErr);
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          parsedJson = JSON.parse(match[0]);
        } catch (regexErr) {
          console.error("Regex extraction parsing failed as well", regexErr);
          throw new Error("Invalid JSON returned by assistant");
        }
      } else {
        throw new Error("Could not extract JSON block from assistant response");
      }
    }

    return NextResponse.json(parsedJson);
  } catch (err: any) {
    console.error("Error in Next.js chat route:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
