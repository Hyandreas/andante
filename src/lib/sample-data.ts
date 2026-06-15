// ARCHIVE — preserved placeholder/demo data.
//
// This data is no longer shown by default: the first-run tutorial starts the
// app empty so a new user builds it up from nothing. It is kept intact here so
// it can be restored at any time for development reference by setting
// NEXT_PUBLIC_DEMO_FIXTURES=1 (see `demoFixturesEnabled()` in src/lib/env.ts).
// The data layer (src/lib/app-data.ts) chooses between these fixtures and empty
// states based on that flag. Do not delete — this is the saved snapshot.
//
// Static demo data so the app renders meaningfully before Supabase is wired
// up. Each screen reads from this until the data layer hooks ship.

export interface Piece {
  id: string;
  name: string;
  composer: string;
  role: string;
  progress: number;
  weekTime: string;
  lastPracticed: string;
  totalSessions: number;
}

export const PIECES: Piece[] = [
  { id: "p1", name: "Brahms Sonata No. 3 in D minor", composer: "J. Brahms · Op. 108", role: "Sonata", progress: 0.62, weekTime: "4h 20m this week", lastPracticed: "Today, 8:14 AM", totalSessions: 38 },
  { id: "p2", name: "Sibelius Concerto in D minor",   composer: "J. Sibelius · Op. 47", role: "Concerto", progress: 0.41, weekTime: "3h 05m this week", lastPracticed: "Yesterday", totalSessions: 22 },
  { id: "p3", name: "Bach Sonata No. 1 in G minor",   composer: "J.S. Bach · BWV 1001", role: "Solo", progress: 0.78, weekTime: "1h 50m this week", lastPracticed: "2 days ago", totalSessions: 51 },
  { id: "p4", name: "Paganini Caprice No. 24",        composer: "N. Paganini · Op. 1",  role: "Etude", progress: 0.34, weekTime: "55m this week", lastPracticed: "3 days ago", totalSessions: 14 },
];

export interface SessionItem {
  start: string;
  duration: string;
  focus: string;
  pieces: string[];
}
export interface SessionGroup {
  date: string;
  items: SessionItem[];
}

export const SESSIONS: SessionGroup[] = [
  { date: "TODAY · TUE NOV 11", items: [
    { start: "8:14 AM", duration: "1h 12m", focus: "Repertoire", pieces: ["Brahms Sonata No. 3", "Bach Sonata No. 1"] },
    { start: "6:02 AM", duration: "28m",    focus: "Scales",     pieces: ["G major arpeggios"] },
  ]},
  { date: "MON NOV 10", items: [
    { start: "7:42 PM",  duration: "55m",    focus: "Repertoire",     pieces: ["Sibelius Concerto"] },
    { start: "10:18 AM", duration: "1h 04m", focus: "Etudes",         pieces: ["Paganini Caprice 24"] },
    { start: "8:00 AM",  duration: "32m",    focus: "Sight-Reading",  pieces: ["Schubert lieder"] },
  ]},
  { date: "SUN NOV 9", items: [
    { start: "4:20 PM", duration: "1h 38m", focus: "Repertoire", pieces: ["Brahms Sonata No. 3", "Sibelius Concerto"] },
  ]},
  { date: "SAT NOV 8", items: [
    { start: "9:30 AM", duration: "2h 04m", focus: "Repertoire", pieces: ["Brahms Sonata No. 3"] },
    { start: "8:15 AM", duration: "22m",    focus: "Scales",     pieces: ["D minor scales"] },
  ]},
  { date: "FRI NOV 7", items: [
    { start: "6:48 PM",  duration: "48m",    focus: "Etudes",     pieces: ["Paganini Caprice 24"] },
    { start: "11:00 AM", duration: "1h 15m", focus: "Repertoire", pieces: ["Bach Sonata No. 1", "Brahms Sonata No. 3"] },
  ]},
  { date: "THU NOV 6", items: [
    { start: "5:30 PM", duration: "1h 02m", focus: "Repertoire", pieces: ["Sibelius Concerto"] },
  ]},
];

export interface Audition {
  name: string;
  location: string;
  date: string;
  daysLeft: number;
  progress: number;
}

export const AUDITIONS: Audition[] = [
  { name: "Curtis Pre-Screen", location: "Recorded Submission", date: "Dec 4, 2026", daysLeft: 23, progress: 0.62 },
  { name: "Juilliard Live Round", location: "New York, NY",     date: "Feb 18, 2027", daysLeft: 99, progress: 0.18 },
  { name: "NEC Honors",        location: "Boston, MA",          date: "Apr 02, 2027", daysLeft: 142, progress: 0.05 },
];

export const HOME_DATA = {
  // Fixed "demo today" so the dashboard hero matches the rest of the seed
  // timeline (log shows TUE NOV 11, Curtis audition is 23 days out → Dec 4).
  dateLabel: "Tuesday · Nov 11",
  streak: 23,
  weekDaysPracticed: 6,
  todayMinutes: 78,
  goalMinutes: 90,
  weekDays: [124, 78, null, null, null, null, null] as (number | null)[],
  todayIdx: 1,
  weekTotal: "11h 24m",
  daysToAudition: 23,
  auditionName: "Curtis Pre-Screen",
  auditionDate: "Dec 4, 2026",
  auditionLocation: "Recorded Submission",
  auditionProgress: 0.62,
};

// ─── Pathways ──────────────────────────────────────────────────────────────
export interface PathwayRequirement {
  label: string;
  piece: string;
  status: "todo" | "active" | "done";
}
export interface Pathway {
  id: string;
  region: string;
  flag: string;
  name: string;
  deadline: string;
  daysLeft: number | null;
  enrolled: number;
  requirements: PathwayRequirement[];
  cohortAvg: { weekHours: number; streak: number };
  yourRank: number;
  cohortSize: number;
  insight: string;
}

export const PATHWAYS: Pathway[] = [
  {
    id: "ny-allstate", region: "USA · New York", flag: "US", name: "NYSSMA All-State",
    deadline: "Apr 12 · audition window", daysLeft: 47, enrolled: 1284,
    requirements: [
      { label: "Solo from NYSSMA Manual Lvl 6", status: "done",   piece: "Bach Sonata No. 1 in G minor" },
      { label: "Two contrasting etudes",        status: "active", piece: "Kreutzer No. 32 + Rode No. 7" },
      { label: "Three-octave scale (judge's choice)", status: "active", piece: "All major + harmonic minor" },
      { label: "Sight-reading",                 status: "todo",   piece: "—" },
    ],
    cohortAvg: { weekHours: 9.4, streak: 18 }, yourRank: 142, cohortSize: 1284,
    insight: "Top-quartile All-State applicants log ≥ 11h/week and a 30-day streak by submission.",
  },
  {
    id: "concerto-cmim", region: "International · Montreal", flag: "CA", name: "Concours Musical International",
    deadline: "Jan 18 · video round", daysLeft: 24, enrolled: 412,
    requirements: [
      { label: "Major concerto, mvt. I",     status: "active", piece: "Sibelius Concerto in D minor" },
      { label: "Romantic showpiece",         status: "active", piece: "Wieniawski Polonaise" },
      { label: "Bach unaccompanied movement",status: "done",   piece: "Bach Sonata No. 1 — Adagio" },
      { label: "Living composer work",       status: "todo",   piece: "—" },
    ],
    cohortAvg: { weekHours: 14.2, streak: 41 }, yourRank: 38, cohortSize: 412,
    insight: "CMIM finalists average 14h+ and submit ≥ 6 takes per movement before final cut.",
  },
  {
    id: "regionals-east", region: "USA · Eastern Region", flag: "US", name: "Eastern Regional Orchestra",
    deadline: "Mar 02 · live audition", daysLeft: 88, enrolled: 2104,
    requirements: [
      { label: "Beethoven 5 — mvt. III scherzo", status: "active", piece: "Excerpt · mm. 1–80" },
      { label: "Mozart 39 — mvt. IV",            status: "active", piece: "Excerpt · mm. 1–60" },
      { label: "Strauss Don Juan opening",       status: "todo",   piece: "—" },
      { label: "Sight-reading",                  status: "todo",   piece: "—" },
    ],
    cohortAvg: { weekHours: 7.6, streak: 12 }, yourRank: 412, cohortSize: 2104,
    insight: "Mock-audition recordings 3+ weeks early correlate with 2.4× advance rate.",
  },
  {
    id: "asia-orch", region: "Asia · Tokyo / Seoul / Shanghai", flag: "APAC", name: "Pro-Track Orchestra Excerpts",
    deadline: "Continuous", daysLeft: null, enrolled: 3870,
    requirements: [
      { label: "Don Juan opening",                status: "active", piece: "Strauss · mm. 1–62" },
      { label: "Ein Heldenleben Concertmaster solo", status: "active", piece: "Strauss · Reh. 9" },
      { label: "Schumann 2 — mvt. II Scherzo",    status: "active", piece: "Excerpt" },
      { label: "Tchaikovsky 4 — mvt. III pizzicato", status: "todo", piece: "—" },
      { label: "Mozart 35 — mvt. IV opening",     status: "active", piece: "Excerpt" },
    ],
    cohortAvg: { weekHours: 16.1, streak: 67 }, yourRank: 904, cohortSize: 3870,
    insight: "Asia pro-track median is 16h/week with multi-tempo loop-trainer drills.",
  },
];

// ─── Rooms ─────────────────────────────────────────────────────────────────
export interface Room {
  id: string;
  name: string;
  host: string;
  region: string;
  count: number;
  max: number;
  focus: string;
  piece: string;
  live: boolean;
  mood: "focused" | "intense" | "playful" | "monastic";
  scheduled?: string;
}

export const ROOMS: Room[] = [
  { id: "r1", name: "Brahms 3 · Slow & Deep",     host: "Mia T.",     region: "US · NYC",       count: 7,  max: 12, focus: "Repertoire",   piece: "Brahms Sonata No. 3",          live: true,  mood: "focused" },
  { id: "r2", name: "Don Juan Sectional",          host: "Hiroshi K.", region: "JP · Tokyo",     count: 14, max: 16, focus: "Excerpts",     piece: "R. Strauss · Don Juan",         live: true,  mood: "intense" },
  { id: "r3", name: "Sight-Reading Sprints",       host: "Olivia P.",  region: "CA · Toronto",   count: 4,  max: 8,  focus: "Sight-Reading",piece: "Random repertoire",            live: true,  mood: "playful" },
  { id: "r4", name: "Bach Sonatas & Partitas",     host: "Ethan K.",   region: "KR · Seoul",     count: 9,  max: 12, focus: "Solo Bach",    piece: "Open · choose your own",       live: true,  mood: "monastic" },
  { id: "r5", name: "Pre-screen Live Mock",        host: "Aria C.",    region: "US · LA",        count: 3,  max: 4,  focus: "Mock Audition",piece: "Curtis pre-screen rep",        live: false, mood: "intense", scheduled: "Today · 7:00 PM" },
  { id: "r6", name: "Asia Pro-Track Excerpts",     host: "Wei L.",     region: "CN · Shanghai",  count: 22, max: 30, focus: "Excerpts",     piece: "Strauss · Schumann · Mozart",  live: true,  mood: "focused" },
];

// ─── Leaderboard ───────────────────────────────────────────────────────────
export interface Leader {
  rank: number;
  name: string;
  instrument: string;
  region: string;
  weekHours: number;
  streak: number;
  kudos: number;
  you: boolean;
  trend: number[];
}

export const LEADERS: Leader[] = [
  { rank: 1,  name: "Hiroshi Kawamura", instrument: "Violin", region: "JP", weekHours: 19.4, streak: 142, kudos: 312, you: false, trend: [12, 14, 16, 19.4] },
  { rank: 2,  name: "Mia Tanaka",       instrument: "Violin", region: "US", weekHours: 17.8, streak: 41,  kudos: 218, you: false, trend: [10, 13, 15, 17.8] },
  { rank: 3,  name: "Wei Liu",          instrument: "Violin", region: "CN", weekHours: 17.2, streak: 88,  kudos: 196, you: false, trend: [11, 14, 15.5, 17.2] },
  { rank: 4,  name: "Anika Dvorak",     instrument: "Viola",  region: "CZ", weekHours: 16.0, streak: 24,  kudos: 140, you: false, trend: [9, 11, 14, 16] },
  { rank: 5,  name: "Yejin Park",       instrument: "Cello",  region: "KR", weekHours: 15.4, streak: 56,  kudos: 174, you: false, trend: [10, 12, 13, 15.4] },
  { rank: 6,  name: "Ethan Kim",        instrument: "Cello",  region: "US", weekHours: 13.1, streak: 41,  kudos: 122, you: false, trend: [8, 9, 11, 13.1] },
  { rank: 7,  name: "Olivia Park",      instrument: "Piano",  region: "CA", weekHours: 12.6, streak: 14,  kudos: 98,  you: false, trend: [7, 9, 11, 12.6] },
  { rank: 142,name: "You",              instrument: "Violin", region: "US", weekHours: 11.4, streak: 23,  kudos: 47,  you: true,  trend: [6, 8, 10, 11.4] },
];

export const COHORTS = [
  { id: "ny-allstate",   label: "NYSSMA All-State · Violin" },
  { id: "concerto-cmim", label: "CMIM · Strings" },
  { id: "asia-orch",     label: "Asia Pro-Track · Excerpts" },
  { id: "global",        label: "Global · all instruments" },
];

// ─── Live cohort feed ──────────────────────────────────────────────────────
export interface FeedEvent {
  kind: "kudo" | "milestone" | "join" | "submit" | "rank";
  who: string;
  what: string;
  region: string;
  t: string;
}

export const FEED_EVENTS: FeedEvent[] = [
  { kind: "kudo",      who: "Hiroshi K.", what: "kudoed your Brahms take",        region: "JP", t: "12s" },
  { kind: "milestone", who: "Mia T.",     what: "hit a 50-day streak",            region: "US", t: "1m" },
  { kind: "join",      who: "Wei L.",     what: "joined Don Juan Sectional",      region: "CN", t: "2m" },
  { kind: "submit",    who: "Aria C.",    what: "submitted Curtis pre-screen video", region: "US", t: "4m" },
  { kind: "rank",      who: "You",        what: "moved up to #142 in NYSSMA",     region: "US", t: "6m" },
  { kind: "kudo",      who: "Yejin P.",   what: "kudoed Mia T.",                  region: "KR", t: "8m" },
  { kind: "milestone", who: "Ethan K.",   what: "completed Bach Suite No. 2",     region: "US", t: "11m" },
  { kind: "join",      who: "Anika D.",   what: "started CMIM pathway",           region: "CZ", t: "14m" },
];

// ─── Submit-a-Take samples ─────────────────────────────────────────────────
export interface TakeFeedback { who: string; role: string; note: string; }
export interface Take {
  id: string;
  reqLabel: string;
  date: string;
  duration: string;
  status: "judged" | "pending";
  score: number | null;
  feedback: TakeFeedback[];
  queueAhead?: number;
}

export const TAKES: Take[] = [
  { id: "t1", reqLabel: "Bach Sonata No. 1 · Adagio", date: "Today, 8:42 AM", duration: "4:08", status: "judged", score: 89,
    feedback: [
      { who: "Cohort Judge", role: "Anonymous · CMIM finalist '23", note: "Beautiful arc through the second statement. Watch the F# in m. 14 — slightly under." },
      { who: "Mia T.",       role: "Peer · NYSSMA cohort",          note: "Phrase shapes are gorgeous. Bow contact getting glassy at the cadenza." },
    ]
  },
  { id: "t2", reqLabel: "Kreutzer No. 32", date: "Yesterday, 7:48 PM", duration: "3:14", status: "pending", score: null, feedback: [], queueAhead: 4 },
  { id: "t3", reqLabel: "Bach Sonata No. 1 · Adagio", date: "Mon · 6:12 AM", duration: "4:02", status: "judged", score: 81,
    feedback: [
      { who: "Cohort Judge", role: "Anonymous · NEC faculty", note: "Fine intonation. Tempo drifts in mm. 18–22. Use the loop trainer at ♩ 60 for that bar." },
    ]
  },
];

// ─── Students (teacher view) ───────────────────────────────────────────────
export interface Student {
  name: string;
  instrument: string;
  weekHours: number;
  streak: number;
  daysToAudition: number;
  trend: number[];
  pieces: { name: string; hours: number }[];
}

export const STUDENTS: Student[] = [
  { name: "Mia Tanaka",   instrument: "Violin", weekHours: 12.4, streak: 23, daysToAudition: 23,
    trend: [8.2, 10.1, 11.3, 12.4],
    pieces: [{ name: "Brahms Sonata No. 3", hours: 6.2 }, { name: "Sibelius Concerto", hours: 4.1 }, { name: "Bach Sonata No. 1", hours: 2.1 }] },
  { name: "Ethan Kim",    instrument: "Cello", weekHours: 9.8, streak: 41, daysToAudition: 12,
    trend: [7.0, 8.4, 9.1, 9.8],
    pieces: [{ name: "Dvořák Concerto", hours: 5.4 }, { name: "Bach Suite No. 2", hours: 3.2 }] },
  { name: "Olivia Park",  instrument: "Piano", weekHours: 8.1, streak: 14, daysToAudition: 56,
    trend: [6.0, 7.5, 8.0, 8.1],
    pieces: [{ name: "Chopin Ballade No. 4", hours: 4.8 }, { name: "Beethoven Op. 111", hours: 3.3 }] },
  { name: "Noah Schmidt", instrument: "Violin", weekHours: 7.2, streak: 9, daysToAudition: 88,
    trend: [4.0, 5.5, 6.8, 7.2],
    pieces: [{ name: "Mendelssohn Concerto", hours: 4.2 }, { name: "Kreutzer No. 9", hours: 3.0 }] },
  { name: "Aria Chen",    instrument: "Viola", weekHours: 5.4, streak: 6, daysToAudition: 34,
    trend: [4.4, 4.8, 5.2, 5.4],
    pieces: [{ name: "Hindemith Sonata", hours: 3.4 }, { name: "Bach Suite No. 3", hours: 2.0 }] },
  { name: "Leo Martinez", instrument: "Cello", weekHours: 0,   streak: 0,  daysToAudition: 71,
    trend: [3.2, 2.0, 1.0, 0],
    pieces: [{ name: "Saint-Saëns Concerto", hours: 0 }] },
];
