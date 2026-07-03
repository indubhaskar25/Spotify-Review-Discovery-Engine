export interface Persona {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  context: string;
  replayTendencies: string;
  skippedMusic: string;
  unexploredGenres: string[];
  suggestedPrompts: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "late_night",
    name: "Late Night Explorer",
    tagline: "Unwinding in the quiet hours",
    icon: "🌙",
    context: "Wind-down sessions, listening in a dark room. Seeking low-tempo, moody, atmospheric soundscapes that aid relaxation.",
    replayTendencies: "Loops the same 5 slow synth-pop tracks. Suffers from high familiarity bias.",
    skippedMusic: "Skips energetic pop, high-tempo hip-hop, or bright acoustic folk.",
    unexploredGenres: ["Ambient", "Neo Soul", "Jazz", "Dream Pop"],
    suggestedPrompts: [
      "Give me relaxing music I've probably never heard",
      "I want hidden gems for a late night wind down",
      "Something moody, low-tempo, and deep to relax to"
    ]
  },
  {
    id: "gym_listener",
    name: "Gym Listener",
    tagline: "High-energy training sessions",
    icon: "💪",
    context: "High-intensity workouts and runs. Seeking driving rhythms, fast-tempo, electronic beats to maintain workout cadence.",
    replayTendencies: "Loops the same workout playlist of 10 mainstream EDM and trap songs.",
    skippedMusic: "Skips slow ballads, delicate acoustic folk, and classical tracks.",
    unexploredGenres: ["Alternative Hip-Hop", "Experimental", "Electronic (Deep Cuts)", "Neo Soul"],
    suggestedPrompts: [
      "Give me high-tempo workout beats outside mainstream EDM",
      "Upbeat driving rhythms that aren't typical pop hits",
      "Help me escape my repetitive gym playlist loops"
    ]
  },
  {
    id: "indie_fan",
    name: "Curious Indie Fan",
    tagline: "Searching beyond the charts",
    icon: "👥",
    context: "Looking to actively discover new artists outside the Billboard charts. High exploration intent.",
    replayTendencies: "Repeatedly plays the same 90s alternative bands out of habit.",
    skippedMusic: "Skips mainstream radio pop hits and commercial trap.",
    unexploredGenres: ["Indie Rock", "Dream Pop", "Psychedelic R&B", "Experimental"],
    suggestedPrompts: [
      "Something like Bon Iver but more upbeat for a rainy commute",
      "Help me escape my usual 90s alternative habits",
      "Surprise me with obscure indie rock or dream pop gems"
    ]
  },
  {
    id: "study_focus",
    name: "Focus & Study",
    tagline: "Deep work concentration",
    icon: "🎧",
    context: "Deep work, coding, writing, or reading. Needs instrumental-focused or low-lyric music to maintain focus.",
    replayTendencies: "Plays the same lofi hip hop beats stream continuously.",
    skippedMusic: "Skips songs with dominant vocals, sudden tempo changes, or aggressive beats.",
    unexploredGenres: ["Ambient", "Jazz (Contemporary)", "Dream Pop"],
    suggestedPrompts: [
      "I want hidden gems for deep work and coding",
      "Minimalist instrumental music I haven't heard before",
      "Relaxing down-tempo soundscapes that won't distract me"
    ]
  },
  {
    id: "road_trip",
    name: "Weekend Road Trip",
    tagline: "Engaging driving anthems",
    icon: "🚗",
    context: "Long drives with friends. Needs engaging, mid-to-fast-tempo tracks that keep energy up without being fatiguing.",
    replayTendencies: "Replays classic rock and 2010s indie pop anthems.",
    skippedMusic: "Skips slow ambient drones, depressing acoustic folk, or experimental noise.",
    unexploredGenres: ["Alternative R&B", "Dream Pop", "Upbeat Indie", "Neo Soul"],
    suggestedPrompts: [
      "Give me driving anthems outside classic rock",
      "Surprise me—but stay close to my road trip taste",
      "Upbeat indie and alternative R&B hidden gems for a drive"
    ]
  }
];
