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

    // 1. Fetch relevant review search context from FastAPI backend to connect to Review Engine
    let reviewContext = "No review database findings retrieved.";
    try {
      const searchResults = await backendApi.searchReviews(latestMessage, persona?.id || "general", 5);
      if (searchResults && searchResults.length > 0) {
        reviewContext = searchResults
          .map((r, i) => `Finding [${i + 1}] (from Review Database): ${r.document}`)
          .join("\n");
      }
    } catch (err) {
      console.warn("Failed to query reviews from Review Engine backend, falling back to static database context.", err);
    }

    // 2. Format the catalog for the prompt
    const serializedCatalog = TRACKS.map(t => (
      `- ID: ${t.id} | Title: "${t.title}" | Artist: ${t.artist} | Album: ${t.album} | Genre: ${t.genre} | Tempo: ${t.tempo} | Popularity: ${t.popularity}/100 | Vibe: ${t.vibe.join(", ")} | Description: ${t.description}`
    )).join("\n");

    // 3. Formulate the system prompt
    const adventurousnessVal = adventurousness ?? 50;
    const selectedMoods = moodTags && moodTags.length > 0 ? moodTags : ["General"];
    const personaName = persona?.name || "Late Night Explorer";
    const personaContext = persona?.context || "";
    const personaReplays = persona?.replayTendencies || "";
    const personaSkips = persona?.skippedMusic || "";
    const personaUnexplored = persona?.unexploredGenres?.join(", ") || "";

    const systemPrompt = `You are "Spotify Compass" — an AI-native music discovery companion.
Tagline: "Find your next favorite song—not just another familiar one."

YOUR IDENTITY & REASONING DIFFERENTIATION:
Unlike traditional recommendation engines that rely strictly on Collaborative Filtering (which loops the same familiar tracks based on history), you recommend music by reasoning over user intent, mood, activity, context, and active exploration goals. 

DISCOVERY INSIGHTS (Derived from the Part 1 Review Analysis Engine):
You must use these key findings from real user feedback to influence how you recommend music:
- Users complain that "Discover Weekly" repeatedly recommends the same artists. (Avoid recommending the persona's replay artists or mainstream-only acts).
- Users want contextual, mood-aligned recommendations. (Steer choices to fit the listener's exact context and mood tags).
- Users discover music outside Spotify (social media, films) because Spotify is too safe. (Recommend lesser-known "hidden gems" from the catalog).
- Users want clear, logical explanations of WHY a song fits their mood or context. (Explain the reasoning for each pick).

LISTENER PROFILE (Current User context):
- Active Persona: ${personaName}
- Current Listening Context: ${personaContext}
- Replay Tendencies (Familiarity Bias): ${personaReplays}
- Skipped Music (Negative Signals): ${personaSkips}
- Unexplored Genres (Exploration Target): ${personaUnexplored}

CONTROLS CONTEXT:
- Selected Mood/Vibe Tags: ${selectedMoods.join(", ")}
- Adventurousness level: ${adventurousnessVal}/100
  - If < 35 (Safe): Stay closer to familiar genres/styles in the catalog, but still recommend new artists.
  - If 35-70 (Balanced): Recommend a mix of genres, including some unexplored ones.
  - If > 70 (Adventurous): Recommend obscure tracks from unexplored genres (specifically target low popularity values).

MUSIC CATALOG (You MUST recommend 2 to 3 tracks ONLY from this list. Do NOT invent tracks outside this list!):
${serializedCatalog}

INSTRUCTIONS:
1. Provide a conversational response in beautiful Markdown that introduces your recommendations.
2. Address the user's request directly.
3. You MUST perform step-by-step reasoning comparing why traditional collaborative filtering fails for this request vs. why Spotify Compass's context-aware selection succeeds. Explain this contrast clearly to show the AI differentiation.
4. Recommend 2 to 3 specific tracks from the MUSIC CATALOG.
5. For each recommended track, explain WHY it was picked, linking it back to the user's current context/mood and explaining how it breaks them out of their feedback loop.
6. You MUST include a structured JSON block at the very end of your response, wrapped inside a single \`\`\`json ... \`\`\` code block. Follow this exact format:
\`\`\`json
{
  "differentiation": {
    "collaborativeFilteringShortcoming": "Explain what a traditional recommendation system would suggest (e.g. loops or safe hits) and why it fails here.",
    "compassReasoning": "Explain how Spotify Compass reasons using context, mood, and exploration goals to break this cycle."
  },
  "recommendations": [
    {
      "trackId": "E.g., track_indie_1",
      "explanation": "Why Spotify Compass picked this song for your current mood and context."
    }
  ]
}
\`\`\`
Ensure there is absolutely NO text after the closing \`\`\` of the JSON block. Ensure the JSON is valid.`;

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
        persona?.unexploredGenres?.includes(t.genre) || 
        t.vibe.some((v: string) => selectedMoods.map((sm: string) => sm.toLowerCase()).includes(v))
      ).slice(0, 2);
      
      const selectedRecs = mockMatches.length > 0 ? mockMatches : TRACKS.slice(0, 2);
      const recsJson = selectedRecs.map(t => ({
        trackId: t.id,
        explanation: `Compass matched this ${t.genre} gem ("${t.title}" by ${t.artist}) because it perfectly aligns with your "${selectedMoods.join(", ")}" mood, avoiding your usual loop of ${personaReplays}.`
      }));

      return NextResponse.json({
        answer: `### Spotify Compass Analysis

Traditional Collaborative Filtering would fail here by repeatedly serving your familiar loops because of your history of repeating tracks. 

Instead, **Spotify Compass** analyzes your current late-night context, your negative feedback signals (skipping high-tempo pop), and maps it directly to your unexplored target genres.

Here are your personalized recommendations:

${selectedRecs.map((t, idx) => `#### ${idx + 1}. "${t.title}" — ${t.artist}\n* **Why Spotify Compass picked it:** ${recsJson[idx].explanation}`).join("\n\n")}

\`\`\`json
{
  "differentiation": {
    "collaborativeFilteringShortcoming": "Would recommend highly played pop hits or safe, familiar tracks based on your listening history.",
    "compassReasoning": "Filters out high-tempo skips, identifies your late-night wind-down context, and pushes into unexplored ${persona?.unexploredGenres?.[0] || "Ambient"} soundscapes."
  },
  "recommendations": ${JSON.stringify(recsJson, null, 2)}
}
\`\`\``
      });
    }

    const completion = await groq.chat.completions.create({
      messages: apiMessages,
      model,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "No response generated.";
    return NextResponse.json({ answer: responseText });
  } catch (err: any) {
    console.error("Error in Next.js chat route:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
