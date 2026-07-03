import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { backendApi } from "@/lib/api";
import { TRACKS } from "@/lib/catalog";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Helper to generate dynamic, contextual mock response if Groq API key is missing or fails
function generateLocalFallbackResponse(
  persona: any,
  adventurousnessVal: number,
  selectedMoods: string[],
  listenerProfile: any,
  warningMsg: string = ""
) {
  // Filter catalog tracks to avoid loops and skipped tempos/genres
  let candidates = TRACKS.filter(t => {
    // Exclude tracks that overlap with frequently replayed (to avoid loops)
    const isReplayed = listenerProfile.frequently_replayed.toLowerCase().includes(t.artist.toLowerCase()) ||
                       listenerProfile.frequently_replayed.toLowerCase().includes(t.title.toLowerCase());
    if (isReplayed) return false;

    // Exclude tracks matching skipped patterns
    const isSkipped = listenerProfile.frequently_skipped.toLowerCase().includes(t.genre.toLowerCase()) ||
                      t.vibe.some((v: string) => listenerProfile.frequently_skipped.toLowerCase().includes(v.toLowerCase()));
    if (isSkipped) return false;

    return true;
  });

  if (candidates.length === 0) {
    candidates = TRACKS;
  }

  // Sort by adventurousness compatibility
  // If adventurousness > 70, prefer low popularity (obscure deep cuts)
  // If adventurousness < 35, prefer higher popularity (safer choices)
  const sorted = [...candidates].sort((a, b) => {
    if (adventurousnessVal > 70) {
      return a.popularity - b.popularity; // ascending (lower popularity first)
    } else if (adventurousnessVal < 35) {
      return b.popularity - a.popularity; // descending (higher popularity first)
    }
    return 0.5 - Math.random(); // shuffle
  });

  const selectedRecs = sorted.slice(0, 3);
  const picks = selectedRecs.map(t => {
    let reason = "";
    if (selectedMoods.length > 0) {
      reason = `Matches your desired "${selectedMoods.join(", ")}" mood for ${persona?.name || "unwinding"}. It introduces you to ${t.genre} rhythms, carefully avoiding your skipped soundscapes to expand your taste.`;
    } else {
      reason = `This ${t.genre} gem is selected specifically to expand your music bubble. It features clean melodies that avoid your usual repetition patterns, giving you a fresh focus perspective.`;
    }
    return {
      track_id: t.id,
      artist: t.artist,
      title: t.title,
      reason
    };
  });

  return {
    framing: `${warningMsg}Spotify Compass analyzed your listening profile and found three recommendations that match your mood while helping you explore beyond your usual listening habits.`,
    reasoning: `We bypassed your habit of repeating the same tracks by selecting atmospheric ${selectedRecs[0]?.genre || "Alternative"} and ambient electronic pieces.`,
    picks
  };
}

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

    // Determine if the API key is configured and valid
    const rawKey = process.env.GROQ_API_KEY || "";
    const isKeyConfigured = 
      rawKey.trim() !== "" && 
      rawKey.startsWith("gsk_") && 
      !rawKey.includes("your_groq_api_key_here") && 
      rawKey !== "undefined" && 
      rawKey !== "null";

    if (!isKeyConfigured) {
      console.warn("GROQ_API_KEY is not configured or uses placeholder value. Using local fallback generator.");
      const mockResponse = generateLocalFallbackResponse(
        persona,
        adventurousnessVal,
        selectedMoods,
        listenerProfile,
        ""
      );
      return NextResponse.json(mockResponse);
    }

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

CRITICAL TEXT CONSTRAINT:
- Keep each recommended track's reason description extremely concise, limited to exactly 2 to 3 sentences. Avoid long descriptions.

PERSONALITY:
- Friendly, Confident, Curious
- Feels like a music expert who knows the listener personally (never robotic)
- Keep the introduction under two short sentences.

OUTPUT FORMAT:
You MUST return STRICT JSON only. Do not wrap it in markdown backticks or include any introductory/concluding text outside the JSON. Start with '{' and end with '}'.

JSON Schema:
{
  "framing": "Spotify Compass analyzed your listening profile and found three recommendations that match your mood while helping you explore beyond your usual listening habits.",
  "reasoning": "One sentence explaining what changed compared with the listener's normal listening behavior.",
  "picks": [
    {
      "track_id": "Must match one of the track IDs from the MUSIC CATALOG",
      "artist": "Must match the artist of the picked track from the MUSIC CATALOG",
      "title": "Must match the title of the picked track from the MUSIC CATALOG",
      "reason": "Natural explanation referencing both the user's request and the listener profile. Keep it strictly 2 to 3 sentences long."
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

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

    try {
      const completion = await groq.chat.completions.create({
        messages: apiMessages,
        model,
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      
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

      // Enforce the framing text on output
      if (parsedJson && !parsedJson.framing) {
        parsedJson.framing = "Spotify Compass analyzed your listening profile and found three recommendations that match your mood while helping you explore beyond your usual listening habits.";
      }

      return NextResponse.json(parsedJson);
    } catch (groqErr: any) {
      console.warn("Groq API call encountered an error. Falling back to local fallback generator.", groqErr);
      const mockResponse = generateLocalFallbackResponse(
        persona,
        adventurousnessVal,
        selectedMoods,
        listenerProfile,
        ""
      );
      return NextResponse.json(mockResponse);
    }
  } catch (err: any) {
    console.error("Fatal error in Next.js chat route:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
