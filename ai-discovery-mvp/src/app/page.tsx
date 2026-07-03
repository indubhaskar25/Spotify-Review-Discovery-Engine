"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Sliders, 
  Tags, 
  RefreshCw, 
  Database, 
  ArrowRight,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Music,
  Compass,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { Dataset, backendApi } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
}

interface Recommendation {
  title: string;
  description: string;
  category: string;
  impact: string;
}

const DEFAULT_DATASETS: Dataset[] = [
  { dataset_id: "app_store_20260630_110857_4c70802c", record_count: 30, saved_at: "", has_insights: true },
  { dataset_id: "play_store_20260630_110855_5d8e1ddd", record_count: 80, saved_at: "", has_insights: true },
  { dataset_id: "reddit_20260630_110857_7aa47efc", record_count: 3, saved_at: "", has_insights: true },
  { dataset_id: "forum_20260630_110905_91530b4d", record_count: 2, saved_at: "", has_insights: true }
];

const MOOD_TAG_OPTIONS = [
  { id: "indie", label: "Emerging Indie", icon: "🎵" },
  { id: "study", label: "Study & Focus", icon: "🎧" },
  { id: "gym", label: "Workout Boost", icon: "💪" },
  { id: "obscure", label: "Obscure Gems", icon: "🤫" },
  { id: "complaints", label: "Major Complaints", icon: "🚨" },
  { id: "personas", label: "User Personas", icon: "👥" }
];

const SUGGESTED_QUESTIONS = [
  "Why do users struggle to discover new music?",
  "What frustrates users most about recommendations and Smart Shuffle?",
  "Which user segments experience the worst discovery fatigue?",
  "What unmet needs emerge consistently across reviews?"
];

export default function Home() {
  const [datasets, setDatasets] = useState<Dataset[]>(DEFAULT_DATASETS);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [adventurousness, setAdventurousness] = useState<number>(50);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<"connecting" | "connected" | "mock">("connecting");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and fetch datasets
  useEffect(() => {
    async function loadDatasets() {
      try {
        const fetched = await backendApi.getDatasets();
        if (fetched && fetched.length > 0) {
          setDatasets(fetched);
          setSelectedDataset(fetched[0].dataset_id);
          setBackendStatus("connected");
        } else {
          setDatasets(DEFAULT_DATASETS);
          setSelectedDataset(DEFAULT_DATASETS[0].dataset_id);
          setBackendStatus("mock");
        }
      } catch (err) {
        console.warn("Backend unavailable, running in Mock Mode.", err);
        setDatasets(DEFAULT_DATASETS);
        setSelectedDataset(DEFAULT_DATASETS[0].dataset_id);
        setBackendStatus("mock");
      }
    }
    loadDatasets();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle Mood tag toggling
  const handleToggleMood = (label: string) => {
    setSelectedMoods(prev => 
      prev.includes(label) 
        ? prev.filter(m => m !== label) 
        : [...prev, label]
    );
  };

  // Helper to parse JSON block and separate markdown text
  const parseAIResponse = (text: string): { text: string; recommendations: Recommendation[] } => {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        const parsedJson = JSON.parse(match[1].trim());
        const cleanText = text.replace(jsonRegex, "").trim();
        return {
          text: cleanText,
          recommendations: parsedJson.recommendations || [],
        };
      } catch (e) {
        console.error("Failed to parse JSON from response:", e);
      }
    }
    
    return { text, recommendations: [] };
  };

  // Trigger conversational API call
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          datasetId: selectedDataset,
          adventurousness,
          moodTags: selectedMoods,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      const parsed = parseAIResponse(data.answer);

      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: parsed.text,
          recommendations: parsed.recommendations
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: `⚠️ **Connection Error**\n\nFailed to reach the AI Discovery Assistant API route. Please ensure that \`GROQ_API_KEY\` is configured in Vercel settings and the FastAPI backend is running.\n\n*Error details: ${err.message || err}*`,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Reset Chat and settings
  const handleReset = () => {
    setMessages([]);
    setAdventurousness(50);
    setSelectedMoods([]);
  };

  // Render markdown text to clean paragraph/headers
  const renderMessageContent = (content: string) => {
    return content.split("\n\n").map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Header 2
      if (trimmed.startsWith("## ")) {
        return <h2 key={index} className="text-white text-lg font-semibold mt-4 mb-2 border-b border-zinc-800 pb-1">{trimmed.replace("## ", "")}</h2>;
      }
      // Header 3
      if (trimmed.startsWith("### ")) {
        return <h3 key={index} className="text-white text-md font-semibold mt-3 mb-1">{trimmed.replace("### ", "")}</h3>;
      }
      // Blockquote
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={index} className="border-l-3 border-emerald-500 pl-3 italic text-zinc-400 bg-zinc-900/30 py-1 rounded-r-md my-2">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      }
      // Lists
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        return (
          <ul key={index} className="list-disc pl-5 mb-2 text-zinc-300 space-y-1">
            {trimmed.split("\n").map((item, idx) => (
              <li key={idx}>{item.replace(/^[*|-]\s+/, "")}</li>
            ))}
          </ul>
        );
      }

      // Inline formatting helper
      const formatInline = (txt: string) => {
        // Simple bold parser
        const parts = txt.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      return <p key={index} className="text-zinc-300 mb-2 leading-relaxed">{formatInline(trimmed)}</p>;
    });
  };

  // Get adventurousness label
  const getAdventurousnessLabel = () => {
    if (adventurousness < 35) return { text: "Mainstream & Safe", color: "text-emerald-500", desc: "Focuses on popular recommendations & high-satisfaction features." };
    if (adventurousness <= 70) return { text: "Balanced Discovery", color: "text-amber-500", desc: "Mixes mainstream content with emerging features & complaints." };
    return { text: "Wild & Unexplored", color: "text-rose-500", desc: "Deep dive into raw user complaints, niche genres & emerging indie feedback." };
  };

  const currentSliderLabel = getAdventurousnessLabel();

  return (
    <div className="flex h-screen w-screen bg-[#121212] text-white overflow-hidden flex-col md:flex-row">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-[360px] bg-[#191919] border-b md:border-b-0 md:border-r border-[#2A2A2A] flex flex-col shrink-0 overflow-y-auto">
        
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Compass className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Discovery AI
                <span className="text-[10px] bg-[#2A2A2A] text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">MVP</span>
              </h1>
              <p className="text-xs text-zinc-400">Conversational strategic intelligence</p>
            </div>
          </div>

          {/* Backend Status indicator */}
          <div className="mt-4 flex items-center justify-between bg-[#121212] px-3 py-2 rounded-lg border border-[#2a2a2a] text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Source DB:
            </span>
            {backendStatus === "connecting" && (
              <span className="flex items-center gap-1 text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" /> Connecting...
              </span>
            )}
            {backendStatus === "connected" && (
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Railway Live
              </span>
            )}
            {backendStatus === "mock" && (
              <span className="flex items-center gap-1 text-amber-500">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Local Mock
              </span>
            )}
          </div>
        </div>

        {/* Configurations panel */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Dataset Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" /> Select Review Corpus
            </label>
            <select 
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.dataset_id.split("_")[0].toUpperCase()} Reviews ({d.record_count} items)
                </option>
              ))}
            </select>
          </div>

          {/* Adventurousness Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-500" /> Adventurousness
              </label>
              <span className="text-xs font-bold bg-[#2A2A2A] px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/10">
                {adventurousness}%
              </span>
            </div>
            
            <div className="relative pt-1">
              <input 
                type="range"
                min="1"
                max="100"
                value={adventurousness}
                onChange={(e) => setAdventurousness(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer custom-slider slider-track-gradient bg-zinc-800"
              />
            </div>
            
            <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A] space-y-1">
              <div className={`text-xs font-bold ${currentSliderLabel.color}`}>
                {currentSliderLabel.text}
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                {currentSliderLabel.desc}
              </p>
            </div>
          </div>

          {/* Mood / Context Tags */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Tags className="h-4 w-4 text-emerald-500" /> Context Mood Tags
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOOD_TAG_OPTIONS.map((tag) => {
                const isActive = selectedMoods.includes(tag.label);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleMood(tag.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-all duration-200 text-left ${
                      isActive 
                        ? "mood-tag-active border-emerald-500 text-white" 
                        : "border-[#2A2A2A] bg-[#121212] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reset Panel */}
        <div className="p-6 border-t border-[#2A2A2A] bg-[#121212]/50">
          <button 
            onClick={handleReset}
            className="w-full bg-transparent border border-[#2A2A2A] hover:bg-[#2A2A2A] text-zinc-300 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset Configuration
          </button>
        </div>
      </aside>

      {/* Main Conversational Workspace */}
      <main className="flex-1 flex flex-col bg-[#121212] relative overflow-hidden">
        
        {/* Chat Header */}
        <header className="h-16 border-b border-[#2A2A2A] flex items-center justify-between px-6 bg-[#191919]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold">Conversational Discovery Workspace</h2>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            Model: <span className="text-emerald-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">llama-3.1-8b</span>
          </div>
        </header>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">AI Discovery Assistant</h3>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  Ask conversational questions to explore Spotify review feedback. Adjust the sliders and tags in the sidebar to shape how the AI sources recommendations.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-500" /> Suggested Questions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUGGESTED_QUESTIONS.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(question)}
                      className="text-left bg-[#191919] border border-[#2A2A2A] hover:border-emerald-500/50 hover:bg-[#222222] p-4 rounded-xl transition-all duration-300 group flex items-start justify-between gap-3 shadow-md shadow-black/10"
                    >
                      <span className="text-sm text-zinc-200 group-hover:text-white leading-normal font-medium">{question}</span>
                      <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Features List */}
              <div className="bg-[#191919] p-4 rounded-xl border border-[#2A2A2A] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white mb-0.5">Adventurousness Slider</h5>
                    <p className="text-[11px] text-zinc-400">Pushes responses from low-risk mainstream insights to critical, emerging indie feedback.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Tags className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white mb-0.5">Context Mood Filtering</h5>
                    <p className="text-[11px] text-zinc-400">Embeds specific vibes (study, workout, indie) directly into recommendation routing.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-slide-up`}>
                  
                  {/* Sender Name */}
                  <span className="text-[10px] text-zinc-500 font-semibold mb-1 px-1 tracking-wider uppercase">
                    {msg.role === "user" ? "You" : "Discovery Assistant"}
                  </span>
                  
                  {/* Speech bubble */}
                  <div className={`p-5 max-w-[85%] ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                    <div className="prose-custom text-sm">
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  {/* Recommendation Cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[90%]">
                      {msg.recommendations.map((rec, rIdx) => (
                        <div 
                          key={rIdx} 
                          className="bg-[#191919] border border-emerald-500/20 hover:border-emerald-500/60 p-4 rounded-xl transition-all duration-300 shadow-lg relative group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10">
                                {rec.category}
                              </span>
                              <span className={`text-[10px] font-bold ${
                                rec.impact === "High" ? "text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded" : "text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded"
                              }`}>
                                {rec.impact} Impact
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white mb-1.5 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                              <Lightbulb className="h-4 w-4 text-emerald-500" />
                              {rec.title}
                            </h4>
                            <p className="text-xs text-zinc-400 leading-normal">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State bubble */}
              {loading && (
                <div className="flex flex-col items-start animate-pulse">
                  <span className="text-[10px] text-zinc-500 font-semibold mb-1 uppercase tracking-wider">Discovery Assistant</span>
                  <div className="chat-bubble-assistant p-4 flex items-center gap-2">
                    <span className="text-xs text-zinc-400 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500 animate-spin" /> Analyzing reviews & generating recommendations...
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar area */}
        <footer className="p-4 border-t border-[#2A2A2A] bg-[#191919]/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto relative">
            
            {/* active tags ribbon */}
            {selectedMoods.length > 0 && (
              <div className="absolute -top-10 left-0 right-0 flex items-center gap-1.5 overflow-x-auto py-1 px-2 no-scrollbar">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mr-1 flex items-center gap-1">
                  <Tags className="h-3 w-3" /> Active:
                </span>
                {selectedMoods.map((mood) => (
                  <span 
                    key={mood}
                    onClick={() => handleToggleMood(mood)}
                    className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                  >
                    {mood} <span className="text-zinc-500 font-normal">×</span>
                  </span>
                ))}
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about emerging artists, Smart Shuffle loopholes, or study vibe playlists..."
                disabled={loading}
                className="flex-1 bg-[#121212] border border-[#2A2A2A] focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-black h-11 w-11 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-40 disabled:hover:bg-emerald-500"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </footer>
      </main>

    </div>
  );
}
