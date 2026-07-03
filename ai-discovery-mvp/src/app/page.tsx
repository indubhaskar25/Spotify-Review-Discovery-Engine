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
  Compass,
  HelpCircle,
  ArrowRightLeft,
  User,
  Disc,
  Heart,
  Ban,
  Globe,
  Target,
  Sun,
  Moon,
  Zap
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

// Persona suggested/recommended moods configuration
const PERSONA_MOODS: Record<string, string[]> = {
  late_night: ["Chill & Relaxed", "Melancholic"],
  gym_listener: ["Upbeat & High", "Avant-Garde"],
  indie_fan: ["Obscure Indie", "Avant-Garde"],
  study_focus: ["Deep Focus", "Chill & Relaxed"],
  road_trip: ["Upbeat & High", "Chill & Relaxed"]
};

export default function Home() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [adventurousness, setAdventurousness] = useState<number>(60);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize mounting and load theme from localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("spotify-compass-theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.add("light-mode");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light-mode");
    }
    // Set initial suggested tags for default persona
    setSelectedMoods(PERSONA_MOODS[PERSONAS[0].id] || []);
    setInput(PERSONAS[0].suggestedPrompts[0]);
  }, []);

  // Scroll to bottom on new message or loading state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle Listener Profile (Persona) switching
  const handleSelectPersona = (p: Persona) => {
    setSelectedPersona(p);
    setSelectedMoods(PERSONA_MOODS[p.id] || []);
    setInput(p.suggestedPrompts[0]);
    setMessages([]); // Reset chat to prevent state overlap between profiles
  };

  // Toggle Theme between light and dark modes
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("spotify-compass-theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
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

  // Dynamic recommendation badges logic
  const getRecommendationBadges = (track: Track, advValue: number, personaId: string): string[] => {
    const badges: string[] = [];
    
    // 1. 🌱 Hidden Gem
    if (track.popularity < 50) {
      badges.push("🌱 Hidden Gem");
    }
    
    // 2. 🎧 Outside Your Bubble / ✨ Rare Genre
    const activePersona = PERSONAS.find(p => p.id === personaId);
    if (activePersona?.rarely_explored_genres.includes(track.genre)) {
      badges.push("🎧 Outside Your Bubble");
      badges.push("✨ Rare Genre");
    }
    
    // 3. 🌙 Night Listening
    if (personaId === "late_night" && (track.tempo === "slow" || track.genre === "Ambient")) {
      badges.push("🌙 Night Listening");
    }
    
    // 4. 🏋 Workout Match
    if (personaId === "gym_listener" && (track.tempo === "fast" || track.energy === "high")) {
      badges.push("🏋 Workout Match");
    }
    
    // 5. ☕ Focus Friendly
    if (personaId === "study_focus" && (track.tempo === "slow" || track.genre === "Ambient")) {
      badges.push("☕ Focus Friendly");
    }

    // 6. 🎼 Matches Your Mood
    const matchesMood = track.mood_tags.some(t => 
      selectedMoods.map(sm => sm.toLowerCase()).some(sm => t.toLowerCase().includes(sm) || sm.includes(t.toLowerCase()))
    );
    if (matchesMood) {
      badges.push("🎼 Matches Your Mood");
    }
    
    if (badges.length === 0) {
      if (advValue > 70) {
        badges.push("🌌 Adventurous Choice");
      } else {
        badges.push("🎵 Compass Pick");
      }
    }

    return Array.from(new Set(badges)).slice(0, 2);
  };

  // Trigger conversational API call
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
    };

    // Capture the current states at trigger-time to fully eliminate stale updates
    const currentPersona = selectedPersona;
    const currentAdventurousness = adventurousness;
    const currentMoods = selectedMoods;

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
          persona: currentPersona,
          adventurousness: currentAdventurousness,
          moodTags: currentMoods,
        }),
      });

      if (!response.ok) {
        throw new Error(`Compass API error: ${response.status}`);
      }

      const data = await response.json();
      
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
          content: data.framing || "Spotify Compass analyzed your listening profile and found three recommendations that match your mood while helping you explore beyond your usual listening habits.",
          recommendations: recList,
          differentiation: data.reasoning ? {
            collaborativeFilteringShortcoming: "Traditional Recommendations would suggest highly played pop hits or safe, familiar tracks based on your listening history.",
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
    setSelectedMoods(PERSONA_MOODS[selectedPersona.id] || []);
    setInput(selectedPersona.suggestedPrompts[0]);
  };

  // Render markdown text inside chat bubbles (fully theme-aware)
  const renderMessageContent = (content: string) => {
    return content.split("\n\n").map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("## ")) {
        return <h2 key={index} className="text-[var(--text-color)] text-base font-semibold mt-4 mb-1.5 border-b border-[var(--border-color)] pb-1">{trimmed.replace("## ", "")}</h2>;
      }
      if (trimmed.startsWith("### ")) {
        return <h3 key={index} className="text-[var(--text-color)] text-sm font-semibold mt-3 mb-1">{trimmed.replace("### ", "")}</h3>;
      }
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        return (
          <ul key={index} className="list-disc pl-5 mb-2 text-[var(--text-color-muted)] space-y-1">
            {trimmed.split("\n").map((item, idx) => (
              <li key={idx} className="text-xs">{item.replace(/^[*|-]\s+/, "")}</li>
            ))}
          </ul>
        );
      }
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={index} className="border-l-2 border-emerald-500 pl-3 italic text-[var(--text-color-muted)] bg-[var(--surface-color-elevated)] bg-opacity-30 py-1 rounded-r-md my-2 text-xs">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      }

      const formatInline = (txt: string) => {
        const parts = txt.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="text-[var(--text-color)] font-bold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      return <p key={index} className="text-[var(--text-color-muted)] mb-2 leading-relaxed text-xs sm:text-sm">{formatInline(trimmed)}</p>;
    });
  };

  // Prevent SSR rendering hydration mismatches
  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-[#121212] flex items-center justify-center">
        <Disc className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-color)] text-[var(--text-color)] overflow-hidden flex-col md:flex-row transition-all duration-300">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-[380px] compass-sidebar border-b md:border-b-0 md:border-r flex flex-col shrink-0 overflow-y-auto z-20 shadow-2xl">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-color)] bg-opacity-80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Compass className="h-5.5 w-5.5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 font-display text-[var(--text-color)]">
                Spotify Compass
              </h1>
              <p className="text-[11px] text-[var(--text-color-faint)] font-semibold">AI Music Discovery Companion</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-color-muted)] mt-2.5 italic">
            "Find your next favorite song—not just another familiar one."
          </p>
        </div>

        {/* Configurations Panel */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Persona Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-color-faint)] flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-emerald-500" /> Active Listener Profile
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 text-left group hover:scale-[1.01] ${
                      isSelected 
                        ? "bg-emerald-500/10 border-emerald-500 text-[var(--text-color)] shadow-lg shadow-emerald-500/5" 
                        : "border-[var(--border-color)] bg-[var(--surface-color)] bg-opacity-50 text-[var(--text-color-muted)] hover:border-zinc-500 hover:text-[var(--text-color)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg transition-transform duration-300 group-hover:scale-110">{p.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-color)]">{p.name}</h4>
                        {isSelected ? (
                          <span className="text-[9px] font-extrabold text-emerald-500 flex items-center gap-1 mt-0.5 animate-pulse">
                            🟢 Active Profile
                          </span>
                        ) : (
                          <p className="text-[10px] text-[var(--text-color-faint)]">{p.tagline}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listening DNA */}
          <div className="compass-card p-4 rounded-xl border space-y-3 shadow-md transition-all duration-300" key={selectedPersona.id}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-color-faint)] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500" /> Listening DNA
            </h4>
            
            <div className="space-y-3.5 text-xs">
              {/* Heart: Usually Plays */}
              <div className="flex items-start gap-2.5">
                <Heart className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-color-faint)] uppercase tracking-wider block">Usually Plays</span>
                  <span className="text-[var(--text-color)] text-xs font-medium leading-relaxed">{selectedPersona.frequently_replayed}</span>
                </div>
              </div>

              {/* Ban: Usually Skips */}
              <div className="flex items-start gap-2.5">
                <Ban className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-color-faint)] uppercase tracking-wider block">Usually Skips</span>
                  <span className="text-[var(--text-color)] text-xs font-medium leading-relaxed">{selectedPersona.frequently_skipped}</span>
                </div>
              </div>

              {/* Globe: Rarely Explores */}
              <div className="flex items-start gap-2.5">
                <Globe className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-color-faint)] uppercase tracking-wider block">Rarely Explores</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPersona.rarely_explored_genres.map(g => (
                      <span key={g} className="text-[9px] bg-[var(--bg-color)] text-[var(--text-color-muted)] px-2 py-0.5 rounded border border-[var(--border-color)] font-medium">{g}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target: Discovery Goal */}
              <div className="flex items-start gap-2.5">
                <Target className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-color-faint)] uppercase tracking-wider block">Discovery Goal</span>
                  <span className="text-[var(--text-color)] text-xs font-medium leading-relaxed">{selectedPersona.typical_listening_context}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exploration Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-color-faint)] flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-emerald-500" /> Exploration Goal
              </label>
              <span className="text-xs font-extrabold bg-[var(--surface-color-elevated)] px-2 py-0.5 rounded text-emerald-500 dark:text-emerald-700 border border-emerald-500/10">
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
            
            {/* Labeled discovery spectrum */}
            <div className="flex justify-between text-[9px] text-[var(--text-color-faint)] font-bold px-0.5 mt-1 select-none">
              <span className={adventurousness < 35 ? "text-emerald-500" : ""}>Safe Discovery</span>
              <span className="text-zinc-600 dark:text-zinc-400 font-normal">←────────●────────→</span>
              <span className={adventurousness > 70 ? "text-rose-500" : adventurousness >= 35 && adventurousness <= 70 ? "text-amber-500" : ""}>
                {adventurousness > 70 ? "Wild Discovery" : "Balanced"}
              </span>
            </div>
          </div>

          {/* Mood / Context Tags */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-color-faint)] flex items-center gap-2">
                <Tags className="h-3.5 w-3.5 text-emerald-500" /> Context Vibe Tags
              </label>
              <p className="text-[10px] text-[var(--text-color-faint)] mt-1 leading-snug">
                Current listening context used by Compass to personalize recommendations.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOOD_TAG_OPTIONS.map((tag) => {
                const isActive = selectedMoods.includes(tag.label);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleMood(tag.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-lg transition-all duration-200 text-left ${
                      isActive 
                        ? "mood-tag-active border-emerald-500" 
                        : "border-[var(--border-color)] bg-[var(--surface-color)] bg-opacity-50 text-[var(--text-color-muted)] hover:border-zinc-500 hover:text-[var(--text-color)]"
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
        <div className="p-6 border-t border-[var(--border-color)] bg-[var(--surface-color)] bg-opacity-50">
          <button 
            onClick={handleReset}
            className="w-full bg-transparent border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-color-muted)] py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Clear & Reset
          </button>
        </div>
      </aside>

      {/* Main Conversational Workspace */}
      <main className="flex-1 flex flex-col compass-main relative overflow-hidden h-full">
        
        {/* Chat Header */}
        <header className="h-16 border-b compass-header flex items-center justify-between px-6 z-10 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
            <h2 className="text-sm font-semibold font-display text-[var(--text-color)]">Compass Interactive Discovery</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[var(--text-color-muted)] bg-[var(--surface-color)] border border-[var(--border-color)] px-2 py-0.5 rounded flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Catalog size: {TRACKS.length}
            </span>
            
            {/* Theme Toggle in top-right */}
            <button 
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full border border-[var(--border-color)] hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-[var(--text-color)] transition-all bg-[var(--surface-color)] shadow"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            </button>
          </div>
        </header>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-8 space-y-8 animate-fade-in">
              
              {/* Product Hero */}
              <div className="text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20 shadow-inner">
                  <Compass className="h-6 w-6 animate-spin-slow" style={{ animationDuration: "16s" }} />
                </div>
                <h3 className="text-2xl font-black tracking-tight font-display text-[var(--text-color)]">How can Spotify Compass help?</h3>
                <p className="text-[var(--text-color-muted)] text-xs sm:text-sm max-w-md mx-auto leading-normal">
                  By matching your custom context (activity, vibe, adventurousness) to a catalog of 45+ deep-cuts, Compass escapes the collaborative filtering bubble.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-color-faint)] flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-500" /> Suggested Prompts for {selectedPersona.name}
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedPersona.suggestedPrompts.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(question)}
                      className="text-left bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-emerald-500/40 hover:scale-[1.01] p-4 rounded-xl transition-all duration-300 group flex items-center justify-between gap-3 shadow-lg"
                    >
                      <span className="text-xs sm:text-sm text-[var(--text-color-muted)] group-hover:text-[var(--text-color)] leading-normal font-semibold">{question}</span>
                      <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  ))}
                  {/* General escaping habits prompt */}
                  <button
                    onClick={() => handleSendMessage("Help me escape my music bubble.")}
                    className="text-left bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#E91429]/40 hover:scale-[1.01] p-4 rounded-xl transition-all duration-300 group flex items-center justify-between gap-3 shadow-lg"
                  >
                    <span className="text-xs sm:text-sm text-[var(--text-color-muted)] group-hover:text-[var(--text-color)] leading-normal font-semibold">Help me escape my music bubble.</span>
                    <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-[#E91429] group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                </div>
              </div>

              {/* Differentiation callout info box */}
              <div className="bg-[var(--surface-color)] p-5 rounded-2xl border border-[var(--border-color)] space-y-3 shadow-md">
                <h5 className="text-xs font-bold text-[var(--text-color)] flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" /> Why this isn't Collaborative Filtering
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-[var(--text-color-faint)] leading-relaxed">
                  <div className="bg-[var(--bg-color)] p-3 rounded-lg border border-[var(--border-color)]">
                    <span className="text-[9px] font-bold text-[#E91429] block mb-1">TRADITIONAL ALGORITHMS</span>
                    Looks at what similar users played. Repeats mainstream hits and loops your recent history, reinforcing bubble habits.
                  </div>
                  <div className="bg-[var(--bg-color)] p-3 rounded-lg border border-[var(--border-color)]">
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
                  <span className="text-[9px] text-[var(--text-color-faint)] font-bold mb-1 px-1 tracking-wider uppercase flex items-center gap-1.5">
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

                  {/* Differentiation details panel (Why Compass chose these songs) */}
                  {msg.differentiation && (
                    <div className="mt-4 w-full max-w-[85%] compass-card rounded-xl border p-4 space-y-2.5 shadow-lg animate-slide-up">
                      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 dark:text-emerald-700">Why Compass chose these songs</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[var(--bg-color)] p-2.5 rounded border border-[var(--border-color)]">
                          <span className="text-[9px] font-bold text-rose-500 block mb-1">Traditional Recommendations</span>
                          <p className="text-[var(--text-color-muted)] text-[11px] leading-relaxed">
                            {msg.differentiation.collaborativeFilteringShortcoming}
                          </p>
                        </div>
                        <div className="bg-[var(--bg-color)] p-2.5 rounded border border-[var(--border-color)]">
                          <span className="text-[9px] font-bold text-emerald-400 dark:text-emerald-600 block mb-1">AI Discovery Advantage</span>
                          <p className="text-[var(--text-color-muted)] text-[11px] leading-relaxed">
                            {msg.differentiation.compassReasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations Song Cards Grid */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-4 w-full max-w-[90%] space-y-2.5">
                      
                      {/* Section Title */}
                      <div className="border-b border-[var(--border-color)] pb-1.5">
                        <h3 className="text-xs font-black uppercase text-[var(--text-color)] tracking-widest">Your Discovery Picks</h3>
                        <p className="text-[10px] text-[var(--text-color-faint)] font-medium">Selected using your listening habits, context and exploration goals.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.recommendations.map((rec, rIdx) => {
                          const recBadges = getRecommendationBadges(rec.track, adventurousness, selectedPersona.id);
                          return (
                            <div 
                              key={rIdx} 
                              className="compass-card border p-4 rounded-xl shadow-xl flex flex-col hover:scale-[1.01]"
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
                                  <h4 className="text-sm font-extrabold text-[var(--text-color)] truncate">
                                    {rec.track.title}
                                  </h4>
                                  <p className="text-xs text-[var(--text-color-muted)] font-medium truncate mt-0.5">
                                    {rec.track.artist}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <span className="text-[9px] font-bold uppercase bg-[var(--bg-color)] text-[var(--text-color-muted)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                      {rec.track.genre}
                                    </span>
                                    
                                    {/* Render custom relevant badges */}
                                    {recBadges.map((badgeText) => (
                                      <span key={badgeText} className="text-[9px] font-semibold bg-emerald-950/40 text-emerald-400 dark:bg-emerald-50 dark:text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                        {badgeText}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Pick explanation */}
                              <div className="mt-3.5 pt-3 border-t border-[var(--border-color)] flex-1">
                                <h5 className="text-[10px] font-bold text-emerald-400 dark:text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                  <Lightbulb className="h-3 w-3" /> Why AI Recommended This
                                </h5>
                                <p className="text-[11px] text-[var(--text-color-muted)] leading-normal">
                                  {rec.explanation}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Skeleton loaders rendered side-by-side during loading */}
              {loading && (
                <div className="flex flex-col items-start w-full space-y-4">
                  <span className="text-[9px] text-[var(--text-color-faint)] font-bold mb-1 uppercase tracking-wider">Compass AI</span>
                  <div className="chat-bubble-assistant p-4 flex items-center gap-2 w-fit max-w-[85%] shadow-md">
                    <Sparkles className="h-4 w-4 text-emerald-500 animate-spin" />
                    <span className="text-xs text-[var(--text-color-muted)] font-medium">
                      Bypassing collaborative loops and searching catalog...
                    </span>
                  </div>
                  
                  {/* Cards Skeletons */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[90%] mt-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="compass-card border p-4 rounded-xl shadow-xl flex flex-col space-y-3 animate-pulse">
                        <div className="flex gap-4">
                          <div className="h-16 w-16 rounded-lg skeleton-pulse shrink-0" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-zinc-800 dark:bg-zinc-200 rounded w-3/4 skeleton-pulse" />
                            <div className="h-3 bg-zinc-800 dark:bg-zinc-200 rounded w-1/2 skeleton-pulse" />
                            <div className="flex gap-1 pt-1">
                              <div className="h-4 bg-zinc-800 dark:bg-zinc-200 rounded w-12 skeleton-pulse" />
                              <div className="h-4 bg-zinc-800 dark:bg-zinc-200 rounded w-16 skeleton-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
                          <div className="h-3 bg-zinc-800 dark:bg-zinc-200 rounded w-1/3 skeleton-pulse" />
                          <div className="h-3 bg-zinc-800 dark:bg-zinc-200 rounded w-full skeleton-pulse" />
                          <div className="h-3 bg-zinc-800 dark:bg-zinc-200 rounded w-5/6 skeleton-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <footer className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-color)] bg-opacity-50 shrink-0">
          <div className="max-w-3xl mx-auto relative">
            
            {/* active tags ribbon */}
            {selectedMoods.length > 0 && (
              <div className="absolute -top-10 left-0 right-0 flex items-center gap-1.5 overflow-x-auto py-1 px-2 no-scrollbar">
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-color-faint)] font-bold mr-1 flex items-center gap-1">
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
                className="flex-1 compass-input border focus:border-emerald-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-[var(--text-color)] placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
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
