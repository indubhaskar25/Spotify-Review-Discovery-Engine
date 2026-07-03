import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { backendApi } from "@/lib/api";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { messages, datasetId, adventurousness, moodTags } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1].content;

    // 1. Semantically retrieve context from Railway backend
    let contextText = "No relevant reviews retrieved.";
    let retrievedReviews: any[] = [];
    
    if (datasetId) {
      try {
        retrievedReviews = await backendApi.searchReviews(latestMessage, datasetId, 12);
        if (retrievedReviews && retrievedReviews.length > 0) {
          contextText = retrievedReviews
            .map((r, i) => {
              const src = r.metadata?.source || "unknown";
              const author = r.metadata?.author || "anonymous";
              const rating = r.metadata?.rating !== undefined ? r.metadata.rating : "N/A";
              return `Review [${i + 1}]:\nAuthor: ${author}\nPlatform: ${src}\nRating: ${rating}\nContent: ${r.document}`;
            })
            .join("\n\n---\n\n");
        }
      } catch (err) {
        console.error("Failed to query semantic search from Railway backend:", err);
      }
    }

    // 2. Formulate the system prompt based on controls
    const adventurousnessVal = adventurousness ?? 50;
    const selectedMoods = moodTags && moodTags.length > 0 ? moodTags : ["General"];
    
    let adventurousnessGuideline = "";
    if (adventurousnessVal < 35) {
      adventurousnessGuideline = "LOW/SAFE (<35): Stick strictly to mainstream hits, highly-rated reviews, safe/familiar suggestions, and established design patterns. Do not recommend risky or experimental ideas.";
    } else if (adventurousnessVal <= 70) {
      adventurousnessGuideline = "MEDIUM/BALANCED (35-70): Mix mainstream patterns with some lesser-known emerging features, moderate exploration, and balanced review feedback.";
    } else {
      adventurousnessGuideline = "HIGH/ADVENTUROUS (>70): Focus heavily on niche genres, emerging indie features, highly unconventional ideas, raw complaints, and adventurous exploration of taste.";
    }

    const systemPrompt = `You are the "Spotify AI Discovery Assistant" — a strategic AI assistant designed to help product managers and users discover new insights, solve discovery fatigue, and identify product opportunities based on real user reviews.

USER CONTROLS CONTEXT:
- Selected Mood/Vibe Tags: ${selectedMoods.join(", ")}
- Adventurousness level: ${adventurousnessVal}/100
- Adventurousness Guideline: ${adventurousnessGuideline}

RELEVANT USER REVIEW CONTEXT FROM DATABASE:
${contextText}

INSTRUCTIONS:
1. Provide a response answering the user's question, integrating the REVIEW CONTEXT and the USER CONTROLS.
2. If reviews are available, make sure to quote or cite specific user feedback by mentioning the Author, Platform, or Rating where appropriate.
3. Keep the tone professional, creative, and highly analytical.
4. Format your text in beautiful, clean Markdown with clear headings.
5. You MUST include a JSON block at the very end of your response, wrapped inside a single \`\`\`json ... \`\`\` code block, to represent structured recommendations. Follow this exact format:
\`\`\`json
{
  "recommendations": [
    {
      "title": "Actionable product opportunity or song/genre recommendation",
      "description": "Detailed explanation of what this is and how it solves user complaints.",
      "category": "E.g., Algorithm Control / Niche Discovery / UI Design",
      "impact": "High / Medium / Low"
    }
  ]
}
\`\`\`
Ensure there is absolutely NO text after the closing \`\`\` of the JSON block. Ensure the JSON is valid and parsed correctly.`;

    // 3. Compile chat history
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // 4. Call Groq
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          answer: `**API Key Not Set**\n\nThe \`GROQ_API_KEY\` is not configured in the environment variables. Please set the environment variable to enable live AI responses.\n\nHere is a placeholder response based on the selected criteria (Mood: ${selectedMoods.join(", ")}, Adventurousness: ${adventurousnessVal}):\n\n* **Safe recommendation:** Add custom discovery sliders to the home feed.\n* **Adventurous recommendation:** Let users choose between "mainstream" and "deep cuts" mode.\n\n\`\`\`json\n{\n  "recommendations": [\n    {\n      "title": "Novelty Sliders",\n      "description": "Give users dynamic controls over recommendation adventurousness.",\n      "category": "Algorithm Control",\n      "impact": "High"\n    }\n  ]\n}\n\`\`\``,
        }
      );
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
