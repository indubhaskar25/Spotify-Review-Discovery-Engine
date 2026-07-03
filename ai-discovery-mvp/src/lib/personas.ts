export interface Persona {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  frequently_replayed: string;
  frequently_skipped: string;
  typical_listening_context: string;
  rarely_explored_genres: string[];
  recent_listening_patterns: string;
  suggestedPrompts: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "late_night",
    name: "Late Night Explorer",
    tagline: "Unwinding in the quiet hours",
    icon: "🌙",
    typical_listening_context: "Wind-down sessions, listening in a dark room at late night. Seeking low-tempo, moody, atmospheric soundscapes that aid relaxation.",
    frequently_replayed: "The same 5 slow synth-pop tracks out of habit. Suffers from high familiarity bias.",
    frequently_skipped: "Bright acoustic folk and high-tempo pop.",
    rarely_explored_genres: ["Ambient", "Neo Soul", "Jazz", "Dream Pop"],
    recent_listening_patterns: "Loops familiar slow-tempo synth-pop, skipping anything else.",
    suggestedPrompts: [
      "I want relaxing songs I've probably never heard.",
      "Surprise me with hidden gems for a late-night drive.",
      "Recommend music for deep work that isn't mainstream."
    ]
  },
  {
    id: "gym_listener",
    name: "Gym Listener",
    tagline: "High-energy training sessions",
    icon: "💪",
    typical_listening_context: "High-intensity workouts and runs. Seeking driving rhythms, fast-tempo, electronic beats to maintain workout cadence.",
    frequently_replayed: "Loops the same workout playlist of 10 mainstream EDM and trap songs.",
    frequently_skipped: "Slow ballads, delicate acoustic folk, and classical tracks.",
    rarely_explored_genres: ["Alternative Hip-Hop", "Experimental", "Electronic (Deep Cuts)", "Neo Soul"],
    recent_listening_patterns: "Replays high-energy dance pop, skipping low-tempo tracks immediately.",
    suggestedPrompts: [
      "Help me escape my music bubble.",
      "Give me indie artists outside my usual playlist.",
      "Something like Bon Iver but more upbeat."
    ]
  },
  {
    id: "indie_fan",
    name: "Curious Indie Fan",
    tagline: "Searching beyond the charts",
    icon: "👥",
    typical_listening_context: "Looking to actively discover new artists outside the Billboard charts. High exploration intent.",
    frequently_replayed: "Repeatedly plays the same 90s alternative bands out of habit.",
    frequently_skipped: "Mainstream radio pop hits and commercial trap.",
    rarely_explored_genres: ["Indie Rock", "Dream Pop", "Psychedelic R&B", "Experimental"],
    recent_listening_patterns: "Focuses on guitar-based alternative, ignoring electronic or contemporary soul.",
    suggestedPrompts: [
      "Something like Bon Iver but more upbeat.",
      "Give me indie artists outside my usual playlist.",
      "Help me escape my music bubble."
    ]
  },
  {
    id: "study_focus",
    name: "Focus & Study",
    tagline: "Deep work concentration",
    icon: "🎧",
    typical_listening_context: "Deep work, coding, writing, or reading. Needs instrumental-focused or low-lyric music to maintain focus.",
    frequently_replayed: "Plays the same lofi hip hop beats stream continuously.",
    frequently_skipped: "Songs with dominant vocals, sudden tempo changes, or aggressive beats.",
    rarely_explored_genres: ["Ambient", "Jazz (Contemporary)", "Dream Pop"],
    recent_listening_patterns: "Loops study beats, skipping lyrical songs to avoid distraction.",
    suggestedPrompts: [
      "Recommend music for deep work that isn't mainstream.",
      "I want relaxing songs I've probably never heard.",
      "Give me indie artists outside my usual playlist."
    ]
  },
  {
    id: "road_trip",
    name: "Weekend Road Trip",
    tagline: "Engaging driving anthems",
    icon: "🚗",
    typical_listening_context: "Long drives with friends. Needs engaging, mid-to-fast-tempo tracks that keep energy up without being fatiguing.",
    frequently_replayed: "Replays classic rock and 2010s indie pop anthems.",
    frequently_skipped: "Slow ambient drones, depressing acoustic folk, or experimental noise.",
    rarely_explored_genres: ["Alternative R&B", "Dream Pop", "Upbeat Indie", "Neo Soul"],
    recent_listening_patterns: "Plays high-tempo nostalgia playlists, skipping quiet/moody tracks.",
    suggestedPrompts: [
      "Surprise me with hidden gems for a late-night drive.",
      "Something like Bon Iver but more upbeat.",
      "Help me escape my music bubble."
    ]
  }
];
