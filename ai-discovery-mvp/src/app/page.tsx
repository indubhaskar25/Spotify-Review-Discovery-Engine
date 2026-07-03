"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Sliders, 
  Tags, 
  RefreshCw, 
  ArrowRight,
  Lightbulb,
  Music,
  Compass,
  HelpCircle,
  Clock,
  ArrowRightLeft,
  Info,
  User,
  Zap,
  Disc
} from "lucide-react";
import { PERSONAS, Persona } from "@/lib/personas";
import { TRACKS, Track } from "@/lib/catalog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: RecommendationMatch[];
  differentiation?: {
    collaborativeFilteringShortcoming: string;
    compassReasoning: string;
  };
}

interface RecommendationMatch {
  track: Track;
  explanation: string;
}

const MOOD_TAG_OPTIONS = [
  { id: "mood_chill", label: "Chill & Relaxed", icon: "🍃" },
  { id: "mood_focus", label: "Deep Focus", icon: "🧠" },
  { id: "mood_upbeat", label: "Upbeat & High", icon: "⚡" },
  { id: "mood_obscure", label: "Obscure Indie", icon: "🕵️" },
  { id: "mood_melancholy", label: "Melancholic", icon: "🌧️" },
  { id: "mood_experimental", label: "Avant-Garde", icon: "🌀" }
];

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [adventurousness, setAdventurousness] = useState<number>(60);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>(selectedPersona.suggestedPrompts[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message or loading state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Update input text when persona changes to their first suggested prompt
  const handleSelectPersona = (p: Persona) => {
    setSelectedPersona(p);
    setInput(p.suggestedPrompts[0]);
  };

  // Handle Mood tag toggling
  const handleToggleMood = (label: string) => {
    setSelectedMoods(prev => 
      prev.includes(label) 
        ? prev.filter(m => m !== label) 
        : [...prev, label]
    );
  };

  // Helper to generate consistent abstract album art gradients based on song title
  const generateAlbumArtStyle = (title: string) => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = Math.abs((hash + 140) % 360);
    return {
      background: `linear-gradient(135deg, hsl(${h1}, 75%, 45%) 0%, hsl(${h2}, 85%, 15%) 100%)`,
    };
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
          persona: selectedPersona,
          adventurousness,
          moodTags: selectedMoods,
        }),
      });

      if (!response.ok) {
        throw new Error(`Compass API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Match picked track IDs with the actual Tracks catalog
      const recList: RecommendationMatch[] = [];
      if (data.picks && Array.isArray(data.picks)) {
        data.picks.forEach((item: any) => {
          const trackId = item.track_id;
          const matchedTrack = TRACKS.find(t => t.id === trackId);
          if (matchedTrack) {
            recList.push({
              track: matchedTrack,
              explanation: item.reason || item.explanation || "Matches your target profile."
            });
          }
        });
      }

      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: data.framing || "Here are your music discovery recommendations:",
          recommendations: recList,
          differentiation: data.reasoning ? {
            collaborativeFilteringShortcoming: "Traditional Collaborative Filtering would recommend familiar loops and safe hits from your history.",
            compassReasoning: data.reasoning
          } : undefined
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: `⚠️ **Compass Connection Error**\n\nFailed to reach the Spotify Compass server. Ensure that \`GROQ_API_KEY\` is configured in your Vercel deployment variables.\n\n*Error details: ${err.message || err}*`,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Reset Chat and settings
  const handleReset = () => {
    setMessages([]);
    setAdventurousness(60);
    setSelectedMoods([]);
    setInput(selectedPersona.suggestedPrompts[0]);
  };

  // Render markdown text inside chat bubbles
  const renderMessageContent = (content: string) => {
    return content.split("\n\n").map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Header 2
      if (trimmed.startsWith("## ")) {
        return <h2 key={index} className="text-white text-base font-semibold mt-4 mb-1.5 border-b border-zinc-800 pb-1">{trimmed.replace("## ", "")}</h2>;
      }
      // Header 3
      if (trimmed.startsWith("### ")) {
        return <h3 key={index} className="text-white text-sm font-semibold mt-3 mb-1">{trimmed.replace("### ", "")}</h3>;
      }
      // Bullet list
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        return (
          <ul key={index} className="list-disc pl-5 mb-2 text-zinc-300 space-y-1">
            {trimmed.split("\n").map((item, idx) => (
              <li key={idx} className="text-xs">{item.replace(/^[*|-]\s+/, "")}</li>
            ))}
          </ul>
        );
      }
      // Blockquote
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={index} className="border-l-2 border-emerald-500 pl-3 italic text-zinc-400 bg-zinc-900/30 py-1 rounded-r-md my-2 text-xs">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      }

      // Inline formatting helper
      const formatInline = (txt: string) => {
        const parts = txt.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      return <p key={index} className="text-zinc-300 mb-2 leading-relaxed text-xs sm:text-sm">{formatInline(trimmed)}</p>;
    });
  };

  // Slider adventurousness label mapping
  const getAdventurousnessLabel = () => {
    if (adventurousness < 35) {
      return { 
        text: "Safe & Familiar", 
        color: "text-emerald-500", 
        desc: "Stays within familiar boundaries, prioritizing mainstream catalog gems." 
      };
    }
    if (adventurousness <= 70) {
      return { 
        text: "Balanced Discovery", 
        color: "text-amber-500", 
        desc: "Mixes close-matching tunes with several unexplored genre tracks." 
      };
    }
    return { 
      text: "Wild & Obscure", 
      color: "text-rose-500", 
      desc: "Maximum deviation. Selects the most obscure indie, experimental, and world tracks." 
    };
  };

  const currentSliderLabel = getAdventurousnessLabel();

  return (
    <div className="flex h-screen w-screen bg-[#121212] text-white overflow-hidden flex-col md:flex-row">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-[380px] bg-[#171717] border-b md:border-b-0 md:border-r border-[#2A2A2A] flex flex-col shrink-0 overflow-y-auto z-20 shadow-2xl">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#121212]/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Compass className="h-5.5 w-5.5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 font-display">
                Spotify Compass
              </h1>
              <p className="text-[11px] text-zinc-400 font-medium">AI Music Discovery Companion</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2.5 italic">
            \"Find your next favorite song—not just another familiar one.\"
          </p>
        </div>

        {/* Configurations panel */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Persona Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-emerald-500" /> Active Listener Profile
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5" 
                        : "border-[#2A2A2A] bg-[#121212]/50 text-zinc-400 hover:border-zinc-700 hover:bg-[#121212] hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{p.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold">{p.name}</h4>
                        <p className="text-[10px] text-zinc-400">{p.tagline}</p>
                      </div>
                    </div>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persona Constraints Context Card */}
          <div className="bg-[#121212] p-4 rounded-xl border border-[#2A2A2A] space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500" /> User Profile Context
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px]">REPLAY TENDENCY:</span>
                <span className="text-zinc-300">{selectedPersona.frequently_replayed}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px]">SKIPPED PATTERNS:</span>
                <span className="text-zinc-300">{selectedPersona.frequently_skipped}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold block text-[10px]">UNEXPLORED GENRES:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPersona.rarely_explored_genres.map(g => (
                    <span key={g} className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">{g}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Adventurousness Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-emerald-500" /> Exploration Goal
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
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Tags className="h-3.5 w-3.5 text-emerald-500" /> Context Vibe Tags
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
                        : "border-[#2A2A2A] bg-[#121212]/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
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
            <RefreshCw className="h-3.5 w-3.5" /> Clear & Reset
          </button>
        </div>
      </aside>

      {/* Main Conversational Workspace */}
      <main className="flex-1 flex flex-col bg-[#121212] relative overflow-hidden h-full">
        
        {/* Chat Header */}
        <header className="h-16 border-b border-[#2A2A2A] flex items-center justify-between px-6 bg-[#171717] z-10 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
            <h2 className="text-sm font-semibold font-display">Compass Interactive Discovery</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Catalog size: {TRACKS.length}
            </span>
          </div>
        </header>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-8 space-y-8 animate-fade-in">
              
              {/* Product Hero */}
              <div className="text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20 shadow-inner">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black tracking-tight font-display">How can Spotify Compass help?</h3>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
                  By matching your custom context (activity, vibe, adventurousness) to a catalog of 45+ deep-cuts, Compass escapes the collaborative filtering bubble.
                </p>
              </div>

              {/* Suggested Questions (Rainy commute, etc.) */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-500" /> Suggested Prompts for {selectedPersona.name}
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedPersona.suggestedPrompts.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(question)}
                      className="text-left bg-[#171717] border border-[#2A2A2A] hover:border-emerald-500/40 hover:bg-[#222222] p-4 rounded-xl transition-all duration-300 group flex items-center justify-between gap-3 shadow-lg hover:-translate-y-0.5"
                    >
                      <span className="text-xs sm:text-sm text-zinc-300 group-hover:text-white leading-normal font-medium">{question}</span>
                      <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  ))}
                  {/* General Escaping habits prompt */}
                  <button
                    onClick={() => handleSendMessage("Help me escape my usual listening habits")}
                    className="text-left bg-[#171717] border border-[#2A2A2A] hover:border-[#E91429]/40 hover:bg-[#222222] p-4 rounded-xl transition-all duration-300 group flex items-center justify-between gap-3 shadow-lg"
                  >
                    <span className="text-xs sm:text-sm text-zinc-300 group-hover:text-white leading-normal font-medium">Help me escape my usual listening habits</span>
                    <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-[#E91429] group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                </div>
              </div>

              {/* Differentiation callout info box */}
              <div className="bg-[#171717]/80 p-5 rounded-2xl border border-[#2A2A2A] space-y-3 shadow-md">
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" /> Why this isn't Collaborative Filtering
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-zinc-400 leading-relaxed">
                  <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
                    <span className="text-[9px] font-bold text-[#E91429] block mb-1">TRADITIONAL ALGORITHMS</span>
                    Looks at what similar users played. Repeats mainstream hits and loops your recent history, reinforcing bubble habits.
                  </div>
                  <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
                    <span className="text-[9px] font-bold text-emerald-400 block mb-1">SPOTIFY COMPASS WAY</span>
                    Reads your active intent, skips loop habits, checks negative signals, and navigates you to unexplored catalog terrain.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-slide-up`}>
                  
                  {/* Sender Header */}
                  <span className="text-[9px] text-zinc-500 font-bold mb-1 px-1 tracking-wider uppercase flex items-center gap-1.5">
                    {msg.role === "user" ? (
                      <>👤 {selectedPersona.name}</>
                    ) : (
                      <>🧭 Spotify Compass</>
                    )}
                  </span>
                  
                  {/* Message Bubble */}
                  <div className={`p-5 max-w-[85%] ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                    <div className="prose-custom text-sm">
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  {/* Differentiation details panel */}
                  {msg.differentiation && (
                    <div className="mt-3 w-full max-w-[85%] bg-[#171717] rounded-xl border border-zinc-800 p-4 space-y-2.5 shadow-lg animate-slide-up">
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Algorithmic Compass Reasoning</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#121212] p-2.5 rounded border border-zinc-800">
                          <span className="text-[9px] font-bold text-rose-500 block mb-1">COLLABORATIVE FILTERING SHORCOMING</span>
                          <p className="text-zinc-400 text-[11px] leading-relaxed">
                            {msg.differentiation.collaborativeFilteringShortcoming}
                          </p>
                        </div>
                        <div className="bg-[#121212] p-2.5 rounded border border-zinc-800">
                          <span className="text-[9px] font-bold text-emerald-400 block mb-1">SPOTIFY COMPASS RESOLUTION</span>
                          <p className="text-zinc-400 text-[11px] leading-relaxed">
                            {msg.differentiation.compassReasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations Song Cards Grid */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[90%]">
                      {msg.recommendations.map((rec, rIdx) => (
                        <div 
                          key={rIdx} 
                          className="bg-[#171717] border border-zinc-800 hover:border-emerald-500/40 p-4 rounded-xl transition-all duration-300 shadow-xl group flex flex-col"
                        >
                          <div className="flex gap-4">
                            {/* Dynamically colored abstract Album Art */}
                            <div 
                              style={generateAlbumArtStyle(rec.track.title)} 
                              className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden group-hover:scale-105 transition-transform duration-300"
                            >
                              <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                              <Disc className="h-7 w-7 text-white/70 animate-spin-slow" style={{ animationDuration: "12s" }} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-extrabold text-white truncate group-hover:text-emerald-400 transition-colors">
                                {rec.track.title}
                              </h4>
                              <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">
                                {rec.track.artist}
                              </p>
                              
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-[9px] font-bold uppercase bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                                  {rec.track.genre}
                                </span>
                                <span className="text-[9px] font-semibold bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 rounded">
                                  {rec.track.popularity < 45 ? "🔥 Deep Cut" : "⭐ Hidden Gem"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Pick explanation */}
                          <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex-1">
                            <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                              <Lightbulb className="h-3 w-3" /> Why Compass Picked This
                            </h5>
                            <p className="text-[11px] text-zinc-400 leading-normal">
                              {rec.explanation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading bubble with rotating spinner */}
              {loading && (
                <div className="flex flex-col items-start animate-pulse">
                  <span className="text-[9px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">Compass AI</span>
                  <div className="chat-bubble-assistant p-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500 animate-spin" />
                    <span className="text-xs text-zinc-400 font-medium">
                      Compiling taste profile, reviewing negative tags, and filtering catalog...
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <footer className="p-4 border-t border-[#2A2A2A] bg-[#171717] shrink-0">
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
                placeholder="Ask about recommendations, moods, or search music..."
                disabled={loading}
                className="flex-1 bg-[#121212] border border-[#2A2A2A] focus:border-emerald-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-black h-11 w-11 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-40"
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
