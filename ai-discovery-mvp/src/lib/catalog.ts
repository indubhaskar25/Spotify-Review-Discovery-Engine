export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  tempo: "slow" | "medium" | "fast";
  vibe: string[];
  popularity: number; // 0-100, where lower is more obscure/hidden gem
  duration: string;
  description: string;
  artworkSeed: string;
}

export const TRACKS: Track[] = [
  // 1. Indie / Alternative
  {
    id: "track_indie_1",
    title: "Ocean Bed",
    artist: "Black Country, New Road",
    album: "Ants From Up There",
    genre: "Alternative",
    tempo: "medium",
    vibe: ["melancholic", "crescendo", "chamber pop"],
    popularity: 42,
    duration: "6:12",
    description: "A sweeping, emotional blend of horns, strings, and intense vocals that builds to a massive orchestral peak.",
    artworkSeed: "bcnr_ocean"
  },
  {
    id: "track_indie_2",
    title: "Salt",
    artist: "Geowulf",
    album: "Great & Golden",
    genre: "Dream Pop",
    tempo: "medium",
    vibe: ["sunny", "nostalgic", "airy"],
    popularity: 58,
    duration: "3:42",
    description: "Sun-drenched, guitar-driven dream pop from Australia. Perfect for seaside drives and warm afternoons.",
    artworkSeed: "geowulf_salt"
  },
  {
    id: "track_indie_3",
    title: "Pristine",
    artist: "Snail Mail",
    album: "Lush",
    genre: "Indie Rock",
    tempo: "fast",
    vibe: ["angsty", "raw", "guitar-heavy"],
    popularity: 62,
    duration: "4:55",
    description: "Raw, guitar-centric indie rock detailing unrequited teenage longing with incredible emotional clarity.",
    artworkSeed: "snail_mail_pristine"
  },
  {
    id: "track_indie_4",
    title: "In Undertow",
    artist: "Alvvays",
    album: "Antisocialites",
    genre: "Indie Pop",
    tempo: "medium",
    vibe: ["reverberant", "bittersweet", "dreamy"],
    popularity: 68,
    duration: "3:15",
    description: "Fuzzy, jangle-pop guitars surrounding a bittersweet breakup story. An absolute modern indie anthem.",
    artworkSeed: "alvvays_undertow"
  },
  {
    id: "track_indie_5",
    title: "Drunk II",
    artist: "Oso Oso",
    album: "Basking in the Glow",
    genre: "Alternative",
    tempo: "medium",
    vibe: ["catchy", "emo-pop", "honest"],
    popularity: 45,
    duration: "4:28",
    description: "An incredibly infectious alternative track that deals with coping mechanisms and regrets with self-aware humor.",
    artworkSeed: "oso_oso_drunk"
  },
  {
    id: "track_indie_6",
    title: "Pluto",
    artist: "Novo Amor",
    album: "Birthplace",
    genre: "Alternative",
    tempo: "slow",
    vibe: ["ethereal", "acoustic", "soaring"],
    popularity: 55,
    duration: "3:41",
    description: "Soaring falsettos over fragile acoustic picking and ambient brass swells. For fans of Bon Iver.",
    artworkSeed: "novo_amor_pluto"
  },
  {
    id: "track_indie_7",
    title: "We Find Each Other in the Dark",
    artist: "Novo Amor",
    album: "Cannot Be, Whatsoever",
    genre: "Alternative",
    tempo: "slow",
    vibe: ["cinematic", "delicate", "uplifting"],
    popularity: 51,
    duration: "3:18",
    description: "A gorgeous, crescendo-heavy acoustic dreamscape that feels like a quiet sunburst on a dark morning.",
    artworkSeed: "novo_dark"
  },

  // 2. Dream Pop / Ambient
  {
    id: "track_dream_1",
    title: "Amber",
    artist: "Tycho",
    album: "Past Is Prologue",
    genre: "Ambient",
    tempo: "slow",
    vibe: ["warm", "chill", "retro-electronic"],
    popularity: 60,
    duration: "4:48",
    description: "Warm, analog synth melodies layered over dusty down-tempo beats. Incredible for coding and focused working.",
    artworkSeed: "tycho_amber"
  },
  {
    id: "track_dream_2",
    title: "Emerald Rush",
    artist: "Jon Hopkins",
    album: "Singularity",
    genre: "Electronic",
    tempo: "fast",
    vibe: ["hypnotic", "intense", "cinematic"],
    popularity: 56,
    duration: "5:36",
    description: "An immersive, building techno masterpiece that blends organic piano chords with dark, granular synth textures.",
    artworkSeed: "hopkins_emerald"
  },
  {
    id: "track_dream_3",
    title: "Breathe",
    artist: "Telepopmusik",
    album: "Genetic World",
    genre: "Electronic",
    tempo: "slow",
    vibe: ["relaxed", "sensual", "airy"],
    popularity: 69,
    duration: "4:39",
    description: "Lush, trip-hop rhythms and whispered female vocals that create a feeling of weightlessness.",
    artworkSeed: "telepop_breathe"
  },
  {
    id: "track_dream_4",
    title: "Looped",
    artist: "Kiasmos",
    album: "Kiasmos",
    genre: "Ambient",
    tempo: "medium",
    vibe: ["minimalist", "piano", "hypnotic"],
    popularity: 52,
    duration: "6:00",
    description: "Collaborative project combining minimalist classical piano loops with crisp, micro-programmed minimal house beats.",
    artworkSeed: "kiasmos_looped"
  },
  {
    id: "track_dream_5",
    title: "Teardrop",
    artist: "Massive Attack",
    album: "Mezzanine",
    genre: "Experimental",
    tempo: "slow",
    vibe: ["moody", "dark", "harpsichord"],
    popularity: 74,
    duration: "5:31",
    description: "A dark, moody masterpiece featuring a heartbeat rhythm, harpsichord picking, and stunning vocals by Elizabeth Fraser.",
    artworkSeed: "massive_teardrop"
  },
  {
    id: "track_dream_6",
    title: "Intro",
    artist: "The xx",
    album: "xx",
    genre: "Dream Pop",
    tempo: "medium",
    vibe: ["reverberant", "nocturnal", "iconic"],
    popularity: 79,
    duration: "2:08",
    description: "A short, instrumental masterpiece of minimalist reverb guitar, muted bass, and an atmospheric keyboard line.",
    artworkSeed: "xx_intro"
  },
  {
    id: "track_dream_7",
    title: "Slowly",
    artist: "Amon Tobin",
    album: "Supermodified",
    genre: "Experimental",
    tempo: "slow",
    vibe: ["jazzy", "mysterious", "down-tempo"],
    popularity: 38,
    duration: "5:36",
    description: "A mysterious, slow-burning trip-hop track built on acoustic double-bass slices and dusty, chopped jazz drums.",
    artworkSeed: "tobin_slowly"
  },

  // 3. Folk / Acoustic
  {
    id: "track_folk_1",
    title: "Holocene",
    artist: "Bon Iver",
    album: "Bon Iver",
    genre: "Folk",
    tempo: "slow",
    vibe: ["wintry", "delicate", "acoustic"],
    popularity: 72,
    duration: "5:36",
    description: "Crystalline acoustic guitar picking layered with muted brass and Justin Vernon's iconic, layered falsetto.",
    artworkSeed: "bon_iver_holocene"
  },
  {
    id: "track_folk_2",
    title: "White Winter Hymnal",
    artist: "Fleet Foxes",
    album: "Fleet Foxes",
    genre: "Folk",
    tempo: "medium",
    vibe: ["choral", "baroque", "joyful"],
    popularity: 66,
    duration: "2:27",
    description: "A short folk round featuring gorgeous, layered vocal harmonies that evoke snowy evergreen forests.",
    artworkSeed: "fleet_foxes_hymnal"
  },
  {
    id: "track_folk_3",
    title: "Bloom",
    artist: "The Paper Kites",
    album: "Woodland",
    genre: "Folk",
    tempo: "slow",
    vibe: ["warm", "romantic", "intimate"],
    popularity: 70,
    duration: "3:30",
    description: "An intimate fingerpicked folk song featuring warm harmonies and soft whistle hooks. Extremely comforting.",
    artworkSeed: "paper_kites_bloom"
  },
  {
    id: "track_folk_4",
    title: "Rosyln",
    artist: "Bon Iver & St. Vincent",
    album: "The Twilight Saga: New Moon",
    genre: "Folk",
    tempo: "slow",
    vibe: ["haunting", "wintry", "raw"],
    popularity: 77,
    duration: "4:49",
    description: "A haunting collaboration of acoustic guitars, dark cello hums, and intertwined falsettos. Perfect for rainy days.",
    artworkSeed: "rosyln_bon"
  },
  {
    id: "track_folk_5",
    title: "Michigan",
    artist: "Sufjan Stevens",
    album: "Greetings from Michigan",
    genre: "Folk",
    tempo: "slow",
    vibe: ["chamber-folk", "intimate", "narrative"],
    popularity: 49,
    duration: "5:02",
    description: "A beautiful, horn-and-vibraphone laced indie folk track describing bleak Midwestern winter landscapes.",
    artworkSeed: "sufjan_michigan"
  },

  // 4. Neo Soul / Jazz Fusion
  {
    id: "track_soul_1",
    title: "Nakamarra",
    artist: "Hiatus Kaiyote",
    album: "Tawk Tomahawk",
    genre: "Neo Soul",
    tempo: "medium",
    vibe: ["soulful", "funky", "rhythmic"],
    popularity: 58,
    duration: "4:01",
    description: "Complex, off-kilter neo-soul rhythms anchored by Nai Palm's expressive, acrobatic soul vocals.",
    artworkSeed: "hiatus_nakamarra"
  },
  {
    id: "track_soul_2",
    title: "Green & Gold",
    artist: "Lianne La Havas",
    album: "Blood",
    genre: "Neo Soul",
    tempo: "medium",
    vibe: ["organic", "warm", "bouncy"],
    popularity: 61,
    duration: "3:31",
    description: "A warm, personal R&B song constructed around organic basslines, jazz guitars, and smooth backing vocals.",
    artworkSeed: "lianne_green"
  },
  {
    id: "track_soul_3",
    title: "So Good at Being in Trouble",
    artist: "Unknown Mortal Orchestra",
    album: "II",
    genre: "Alternative",
    tempo: "slow",
    vibe: ["lofi", "groovy", "psychedelic"],
    popularity: 64,
    duration: "3:50",
    description: "A dusty, lofi psychedelic R&B jam featuring clean guitar riffs and lazy, soul-influenced vocal delivery.",
    artworkSeed: "umo_so_good"
  },
  {
    id: "track_soul_4",
    title: "Tadow",
    artist: "Masego & FKJ",
    album: "Lady Lady",
    genre: "Jazz",
    tempo: "medium",
    vibe: ["improvisational", "sexy", "groovy"],
    popularity: 76,
    duration: "5:02",
    description: "An improvisational loop masterpiece featuring saxophone, electric keyboards, guitars, and smooth vocals recorded live in Paris.",
    artworkSeed: "masego_tadow"
  },
  {
    id: "track_soul_5",
    title: "Redbone",
    artist: "Childish Gambino",
    album: "\"Awaken, My Love!\"",
    genre: "Neo Soul",
    tempo: "slow",
    vibe: ["funky", "psychedelic-soul", "sultry"],
    popularity: 82,
    duration: "5:26",
    description: "A heavy, retro funk and soul track with pitch-shifted vocals, groovy basslines, and a soaring analog synth solo.",
    artworkSeed: "gambino_redbone"
  },

  // 5. Hip-Hop / R&B
  {
    id: "track_hiphop_1",
    title: "PRIDE.",
    artist: "Kendrick Lamar",
    album: "DAMN.",
    genre: "Hip-Hop",
    tempo: "slow",
    vibe: ["distorted", "dreamy", "introspective"],
    popularity: 78,
    duration: "4:35",
    description: "Introspective hip-hop built around a distorted, warbling guitar loop produced by Steve Lacy. Very atmospheric.",
    artworkSeed: "kendrick_pride"
  },
  {
    id: "track_hiphop_2",
    title: "Self Care",
    artist: "Mac Miller",
    album: "Swimming",
    genre: "Hip-Hop",
    tempo: "medium",
    vibe: ["introspective", "chill", "two-part"],
    popularity: 79,
    duration: "5:45",
    description: "A lush, atmospheric hip-hop track that shifts halfway through into a dreamy synth-laden reflection on healing.",
    artworkSeed: "mac_selfcare"
  },
  {
    id: "track_hiphop_3",
    title: "Glowed Up",
    artist: "KAYTRANADA ft. Anderson .Paak",
    album: "99.9%",
    genre: "Electronic",
    tempo: "fast",
    vibe: ["bumpy", "futuristic", "soulful"],
    popularity: 60,
    duration: "4:58",
    description: "A futuristic beat-scene track that fuses electronic synths, bouncy sub-bass, and Anderson .Paak's raspy soul hooks.",
    artworkSeed: "kaytra_glow"
  },
  {
    id: "track_hiphop_4",
    title: "Pink + White",
    artist: "Frank Ocean",
    album: "Blonde",
    genre: "R&B",
    tempo: "medium",
    vibe: ["warm", "lush", "orchestral"],
    popularity: 85,
    duration: "3:04",
    description: "A beautifully lush alternative R&B song featuring acoustic piano, soft strings, and backing vocals by Beyoncé.",
    artworkSeed: "ocean_pink"
  },
  {
    id: "track_hiphop_5",
    title: "On & On",
    artist: "Erykah Badu",
    album: "Baduizm",
    genre: "R&B",
    tempo: "slow",
    vibe: ["classic", "organic-hiphop", "spiritual"],
    popularity: 67,
    duration: "3:45",
    description: "The definitive Neo Soul track, combining organic hip-hop beats, warm jazz Fender Rhodes piano, and Badu's spiritual vocals.",
    artworkSeed: "erykah_on"
  },

  // 6. World Music / Experimental
  {
    id: "track_world_1",
    title: "Mariama",
    artist: "Baaba Maal",
    album: "Missing You",
    genre: "World Music",
    tempo: "slow",
    vibe: ["acoustic", "senegalese", "spiritual"],
    popularity: 30,
    duration: "4:32",
    description: "Stunning Senegalese acoustic folk featuring intricate kora picking, acoustic guitar, and Baaba Maal's powerful vocals.",
    artworkSeed: "maal_mariama"
  },
  {
    id: "track_world_2",
    title: "Gallowdance",
    artist: "Lebanon Hanover",
    album: "Tomb for Two",
    genre: "Experimental",
    tempo: "medium",
    vibe: ["darkwave", "gothic", "hypnotic"],
    popularity: 54,
    duration: "3:52",
    description: "A darkwave post-punk track featuring a driving, cold bassline, repeating analog synth lines, and haunting dual vocals.",
    artworkSeed: "lebanon_gallow"
  },
  {
    id: "track_world_3",
    title: "Rose Quartz",
    artist: "Toro y Moi",
    album: "Anything in Return",
    genre: "Electronic",
    tempo: "medium",
    vibe: ["house", "glofi", "smooth"],
    popularity: 59,
    duration: "3:24",
    description: "Lush chillwave/house crossover with smooth vocal chops, warm synth pads, and a driving, four-on-the-floor beat.",
    artworkSeed: "toro_quartz"
  },
  {
    id: "track_world_4",
    title: "Starry Night",
    artist: "Peggy Gou",
    album: "Moment EP",
    genre: "Electronic",
    tempo: "fast",
    vibe: ["piano-house", "grooving", "uplifting"],
    popularity: 64,
    duration: "6:38",
    description: "An uplifting, retro-inspired house track that combines classical piano loops with energetic electronic beats and Korean vocals.",
    artworkSeed: "peggy_starry"
  },
  {
    id: "track_world_5",
    title: "Pluto",
    artist: "Björk",
    album: "Homogenic",
    genre: "Experimental",
    tempo: "fast",
    vibe: ["aggressive", "electronic", "industrial"],
    popularity: 43,
    duration: "3:19",
    description: "A blistering, industrial electronic track featuring aggressive synthesizer sweeps and visceral, raw vocal screams.",
    artworkSeed: "bjork_pluto"
  },

  // 7. Ambient / Electronic (Deep Cuts)
  {
    id: "track_ambient_1",
    title: "Stone In Focus",
    artist: "Aphex Twin",
    album: "Selected Ambient Works Volume II",
    genre: "Ambient",
    tempo: "slow",
    vibe: ["minimalist", "spiritual", "peaceful"],
    popularity: 52,
    duration: "10:11",
    description: "A legendary, extremely slow, repeating synthesizer chord progression that induces a state of deep meditation.",
    artworkSeed: "aphex_stone"
  },
  {
    id: "track_ambient_2",
    title: "Rhubarb",
    artist: "Aphex Twin",
    album: "Selected Ambient Works Volume II",
    genre: "Ambient",
    tempo: "slow",
    vibe: ["warm", "melancholic", "nostalgic"],
    popularity: 64,
    duration: "7:44",
    description: "A beautiful, drift-like synth pads composition that feels like a quiet, warm blanket on a cold afternoon.",
    artworkSeed: "aphex_rhubarb"
  },
  {
    id: "track_ambient_3",
    title: "Treefingers",
    artist: "Radiohead",
    album: "Kid A",
    genre: "Ambient",
    tempo: "slow",
    vibe: ["guitar-loops", "airy", "isolated"],
    popularity: 58,
    duration: "3:42",
    description: "A processed ambient instrumental created entirely by looping and filtering Thom Yorke's guitar playing. Hauntingly beautiful.",
    artworkSeed: "radiohead_tree"
  },
  {
    id: "track_ambient_4",
    title: "Aria",
    artist: "Vangelis",
    album: "Voices",
    genre: "Ambient",
    tempo: "slow",
    vibe: ["cosmic", "synths", "operatic"],
    popularity: 41,
    duration: "5:18",
    description: "A grand cosmic soundscape with floating female operatic notes and sweeping cinematic synthesizers.",
    artworkSeed: "vangelis_aria"
  },

  // 8. R&B (Alternative)
  {
    id: "track_rnb_1",
    title: "Biking",
    artist: "Frank Ocean",
    album: "Biking Single",
    genre: "R&B",
    tempo: "medium",
    vibe: ["acoustic-guitar", "dreamy-rnb", "summer"],
    popularity: 70,
    duration: "4:37",
    description: "Alternative R&B led by clean acoustic guitar strums, shifting into a heavy synth beat with Frank's warm melodies.",
    artworkSeed: "ocean_biking"
  },
  {
    id: "track_rnb_2",
    title: "SOHO",
    artist: "Jaden",
    album: "ERYS",
    genre: "Alternative",
    tempo: "medium",
    vibe: ["atmospheric-rnb", "guitar", "smooth"],
    popularity: 57,
    duration: "3:39",
    description: "Atmospheric, guitar-laden alternative R&B describing young love in New York with smooth, melodic vocals.",
    artworkSeed: "jaden_soho"
  },
  {
    id: "track_rnb_3",
    title: "Get You",
    artist: "Daniel Caesar ft. Kali Uchis",
    album: "Freudian",
    genre: "R&B",
    tempo: "slow",
    vibe: ["sensual", "warm", "minimal-groove"],
    popularity: 81,
    duration: "4:38",
    description: "A sultry, slow-grooving contemporary R&B ballad centered on minimal electric bass and Caesar's smooth vocals.",
    artworkSeed: "caesar_getyou"
  },

  // 9. Jazz (Contemporary / Obscure)
  {
    id: "track_jazz_1",
    title: "Flamingo",
    artist: "Yusef Lateef",
    album: "The Three Faces of Yusef Lateef",
    genre: "Jazz",
    tempo: "slow",
    vibe: ["soulful-jazz", "exotic", "flute"],
    popularity: 33,
    duration: "5:01",
    description: "A gorgeous, bluesy jazz recording featuring Lateef's unique, breathy oboe and flute solos.",
    artworkSeed: "lateef_flamingo"
  },
  {
    id: "track_jazz_2",
    title: "Theme de Yoyo",
    artist: "Art Ensemble of Chicago",
    album: "Les Stances a Sophie",
    genre: "Jazz",
    tempo: "fast",
    vibe: ["avant-garde", "explosive", "funky"],
    popularity: 35,
    duration: "9:10",
    description: "An explosive, funky avant-garde jazz masterpiece featuring blazing horns and free-improvised drums.",
    artworkSeed: "ensemble_yoyo"
  },
  {
    id: "track_jazz_3",
    title: "Blue in Green",
    artist: "Miles Davis",
    album: "Kind of Blue",
    genre: "Jazz",
    tempo: "slow",
    vibe: ["moody", "late-night", "melancholic"],
    popularity: 71,
    duration: "5:37",
    description: "A slow, modal jazz masterpiece featuring Miles' muted trumpet, Bill Evans' chords, and John Coltrane's tenor sax.",
    artworkSeed: "miles_blue"
  }
];
