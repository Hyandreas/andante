import {
  AUDITIONS as AUDITION_FALLBACK,
  HOME_DATA as HOME_DATA_FALLBACK,
  PATHWAYS as PATHWAY_FALLBACK,
  PIECES as PIECE_FALLBACK,
  ROOMS as ROOM_FALLBACK,
  SESSIONS as SESSION_FALLBACK,
  type Pathway as FallbackPathway,
  type Piece as FallbackPiece,
  type Room as FallbackRoom,
  type SessionGroup as FallbackSessionGroup,
} from "@/lib/sample-data";
import { formatHrMin } from "@/lib/utils";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { demoFixturesEnabled, isSupabaseConfigured } from "@/lib/env";
import type {
  AuditionRow,
  PathwayProgressRow,
  PathwayRequirementRow,
  PathwayRow,
  PieceRow,
  RoomRow,
  RoomSeatRow,
  SessionPieceRow,
  SessionRow,
  UserRow,
} from "@/lib/supabase/types";

export interface PieceCardData extends FallbackPiece {
  // Optional sheet-music link auto-discovered from IMSLP (demo/local pieces).
  sheet?: { title: string; sourceUrl: string; sourceName: string } | null;
  sheetStatus?: "idle" | "searching" | "found" | "none";
}

export interface HomePageData {
  dateLabel: string;
  streak: number;
  todayMinutes: number;
  goalMinutes: number;
  weekDays: (number | null)[];
  todayIdx: number;
  // ISO date (YYYY-MM-DD) of the Monday that anchors the week window, so the
  // chart can derive correct weekday labels instead of assuming Mon–Sun.
  weekStartKey: string;
  weekTotal: string;
  activePiece: PieceCardData | null;
  nextAudition: {
    name: string;
    location: string;
    date: string;
    daysLeft: number;
    progress: number;
  } | null;
  activePieces: PieceCardData[];
}

export interface LogPageData {
  weekTotal: string;
  monthTotal: string;
  groups: FallbackSessionGroup[];
}

export interface GoalsPageData {
  goalMin: number;
  auditions: {
    name: string;
    location: string;
    date: string;
    daysLeft: number;
    progress: number;
  }[];
}

export interface PathwayRequirementView {
  id: string;
  label: string;
  piece: string;
  status: "todo" | "active" | "done";
}

export interface PathwayView extends Omit<FallbackPathway, "requirements"> {
  requirements: PathwayRequirementView[];
}

export interface RoomView extends FallbackRoom {}

const FALLBACK_ACTIVE_PIECE = PIECE_FALLBACK[0];
const FALLBACK_AUDITION = AUDITION_FALLBACK[0];
const FALLBACK_PATHWAYS: PathwayView[] = PATHWAY_FALLBACK.map((pathway) => ({
  ...pathway,
  requirements: pathway.requirements.map((requirement, index) => ({
    id: `${pathway.id}-${index}`,
    label: requirement.label,
    piece: requirement.piece,
    status: requirement.status,
  })),
}));

function formatDateLabel(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);

  return `${weekday} · ${monthDay}`;
}

function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function clockLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function shortDateLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

function logDateLabel(date: Date, now: Date, timeZone: string) {
  const key = dayKey(date, timeZone);
  const todayKey = dayKey(now, timeZone);
  const yesterdayKey = dayKey(new Date(now.getTime() - 86400000), timeZone);
  const longLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(date)
    .replace(",", "")
    .toUpperCase();

  if (key === todayKey) return `TODAY · ${longLabel}`;
  if (key === yesterdayKey) return `YESTERDAY · ${longLabel}`;
  return longLabel;
}

function relativePracticeLabel(date: Date, now: Date, timeZone: string) {
  const key = dayKey(date, timeZone);
  const todayKey = dayKey(now, timeZone);
  const yesterdayKey = dayKey(new Date(now.getTime() - 86400000), timeZone);

  if (key === todayKey) return `Today, ${clockLabel(date, timeZone)}`;
  if (key === yesterdayKey) return "Yesterday";

  let diff = 0;
  while (diff < 7) {
    diff += 1;
    if (dayKey(new Date(now.getTime() - diff * 86400000), timeZone) === key) {
      return `${diff} days ago`;
    }
  }

  return shortDateLabel(date, timeZone);
}

function formatSecondsCompact(totalSeconds: number) {
  return formatHrMin(totalSeconds / 60);
}

function formatMinutesAndSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

// Day-of-week in the user's timezone (0 = Sunday … 6 = Saturday).
function weekdayInTz(date: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

// The Monday-anchored 7-day window that contains `now`. Returns en-CA day keys
// for Mon…Sun. `monAnchoredDow` (Mon = 0 … Sun = 6) is the index of "today"
// within that window — used as todayIdx so bars and labels line up.
function nextSevenDayKeys(now: Date, timeZone: string) {
  const start = weekWindowStart(now, timeZone);
  return Array.from({ length: 7 }, (_, offset) =>
    dayKey(new Date(start.getTime() + offset * 86400000), timeZone),
  );
}

function weekWindowStart(now: Date, timeZone: string) {
  const dow = (weekdayInTz(now, timeZone) + 6) % 7; // Mon = 0 … Sun = 6
  return new Date(now.getTime() - dow * 86400000);
}

function monAnchoredDow(now: Date, timeZone: string) {
  return (weekdayInTz(now, timeZone) + 6) % 7; // Mon = 0 … Sun = 6
}

async function getServerAuthContext() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { supabase, user };
}

function fallbackHomeData(): HomePageData {
  return {
    // Use the seed's fixed demo date (not the real clock) so the hero card
    // stays consistent with the rest of the demo timeline.
    dateLabel: HOME_DATA_FALLBACK.dateLabel,
    streak: HOME_DATA_FALLBACK.streak,
    todayMinutes: HOME_DATA_FALLBACK.todayMinutes,
    goalMinutes: HOME_DATA_FALLBACK.goalMinutes,
    weekDays: HOME_DATA_FALLBACK.weekDays,
    todayIdx: HOME_DATA_FALLBACK.todayIdx,
    // Demo weekDays is a fixed Mon–Sun array, so a Monday anchor keeps the
    // M T W T F S S labels aligned.
    weekStartKey: monAnchoredStartKey("America/New_York"),
    weekTotal: HOME_DATA_FALLBACK.weekTotal,
    activePiece: FALLBACK_ACTIVE_PIECE,
    nextAudition: FALLBACK_AUDITION,
    activePieces: PIECE_FALLBACK,
  };
}

// ISO date of the Monday that anchors the current week in the given timezone.
function monAnchoredStartKey(timeZone: string) {
  return dayKey(weekWindowStart(new Date(), timeZone), timeZone);
}

// A genuinely empty studio — the default first-run experience. No streak, no
// pieces, no audition; the screens render their "build from nothing" states.
const EMPTY_WEEK_DAYS: (number | null)[] = [null, null, null, null, null, null, null];

function emptyHomeData(): HomePageData {
  const now = new Date();
  const timeZone = "America/New_York";
  return {
    dateLabel: formatDateLabel(now, timeZone),
    streak: 0,
    todayMinutes: 0,
    goalMinutes: 60,
    weekDays: EMPTY_WEEK_DAYS,
    todayIdx: monAnchoredDow(now, timeZone),
    weekStartKey: dayKey(weekWindowStart(now, timeZone), timeZone),
    weekTotal: "0m",
    activePiece: null,
    nextAudition: null,
    activePieces: [],
  };
}

async function loadSessionMaps(
  sessions: SessionRow[],
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
) {
  if (sessions.length === 0) {
    return {
      sessionPieces: [] as SessionPieceRow[],
      pieceIds: [] as string[],
    };
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data: sessionPieces } = await supabase
    .from("session_pieces")
    .select("*")
    .in("session_id", sessionIds);

  const safeSessionPieces = (sessionPieces ?? []) as SessionPieceRow[];
  const pieceIds = Array.from(new Set(safeSessionPieces.map((entry) => entry.piece_id)));

  return { sessionPieces: safeSessionPieces, pieceIds };
}

export async function getPiecesData(): Promise<PieceCardData[]> {
  const auth = await getServerAuthContext();
  if (!auth) return demoFixturesEnabled() ? PIECE_FALLBACK : [];

  const { supabase, user } = auth;
  const [{ data: pieces }, { data: sessions }, { data: userRow }] = await Promise.all([
    supabase.from("pieces").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }),
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const safePieces = (pieces ?? []) as PieceRow[];
  const safeSessions = (sessions ?? []) as SessionRow[];
  if (safePieces.length === 0) return demoFixturesEnabled() ? PIECE_FALLBACK : [];

  const timeZone = (userRow as UserRow | null)?.timezone ?? "America/New_York";
  const now = new Date();
  const weekKeys = new Set(nextSevenDayKeys(now, timeZone));
  const { sessionPieces } = await loadSessionMaps(safeSessions, supabase);

  return safePieces.map((piece) => {
    const linkedSessions = sessionPieces
      .filter((entry) => entry.piece_id === piece.id)
      .map((entry) => safeSessions.find((session) => session.id === entry.session_id))
      .filter(Boolean) as SessionRow[];
    const latestSession = linkedSessions[0];
    const weekSeconds = linkedSessions.reduce((sum, session) => {
      const key = dayKey(new Date(session.started_at), timeZone);
      return weekKeys.has(key) ? sum + (session.duration_sec ?? 0) : sum;
    }, 0);

    return {
      id: piece.id,
      name: piece.name,
      composer: piece.composer ?? "",
      role: piece.role ?? "",
      progress: piece.progress / 100,
      weekTime: `${formatSecondsCompact(weekSeconds)} this week`,
      lastPracticed: latestSession
        ? relativePracticeLabel(new Date(latestSession.started_at), now, timeZone)
        : "Not yet practiced",
      totalSessions: linkedSessions.length,
    };
  });
}

export async function getHomePageData(): Promise<HomePageData> {
  const auth = await getServerAuthContext();
  if (!auth) return demoFixturesEnabled() ? fallbackHomeData() : emptyHomeData();

  const { supabase, user } = auth;
  const [{ data: sessions }, { data: auditions }, { data: userRow }] = await Promise.all([
    supabase.from("sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(90),
    supabase.from("auditions").select("*").eq("user_id", user.id).order("date", { ascending: true }),
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const safeSessions = (sessions ?? []) as SessionRow[];
  const safeAuditions = (auditions ?? []) as AuditionRow[];
  const safeUser = userRow as UserRow | null;
  const timeZone = safeUser?.timezone ?? "America/New_York";
  const now = new Date();
  const pieces = await getPiecesData();
  const weekKeys = nextSevenDayKeys(now, timeZone);
  const weekMinutes = new Map<string, number>();
  const practicedDays = new Set<string>();

  for (const session of safeSessions) {
    const key = dayKey(new Date(session.started_at), timeZone);
    const minutes = Math.round((session.duration_sec ?? 0) / 60);
    practicedDays.add(key);
    weekMinutes.set(key, (weekMinutes.get(key) ?? 0) + minutes);
  }

  let streak = 0;
  while (practicedDays.has(dayKey(new Date(now.getTime() - streak * 86400000), timeZone))) {
    streak += 1;
  }

  const todayKey = dayKey(now, timeZone);
  const weekDays = weekKeys.map((key) => weekMinutes.get(key) ?? null);
  const todayIdx = monAnchoredDow(now, timeZone);
  const weekStartKey = dayKey(weekWindowStart(now, timeZone), timeZone);
  const todayMinutes = weekMinutes.get(todayKey) ?? 0;
  const weekTotalMinutes = weekDays.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const nextAuditionRow = safeAuditions.find((audition) => new Date(audition.date) >= new Date(now.toDateString()));
  // With fixtures off, an empty real account shows true zeroes instead of the
  // demo seed — so a brand-new user's studio starts quiet.
  const fixtures = demoFixturesEnabled();

  return {
    dateLabel: formatDateLabel(now, timeZone),
    streak: fixtures ? streak || HOME_DATA_FALLBACK.streak : streak,
    todayMinutes: fixtures ? todayMinutes || HOME_DATA_FALLBACK.todayMinutes : todayMinutes,
    goalMinutes: safeUser?.daily_goal_min ?? (fixtures ? HOME_DATA_FALLBACK.goalMinutes : 60),
    weekDays: weekDays.some((value) => value !== null) || !fixtures ? weekDays : HOME_DATA_FALLBACK.weekDays,
    todayIdx,
    weekStartKey,
    weekTotal: weekTotalMinutes > 0 ? formatHrMin(weekTotalMinutes) : fixtures ? HOME_DATA_FALLBACK.weekTotal : "0m",
    activePiece: pieces[0] ?? (fixtures ? FALLBACK_ACTIVE_PIECE : null),
    nextAudition: nextAuditionRow
      ? {
          name: nextAuditionRow.name,
          location: nextAuditionRow.location ?? "TBD",
          date: shortDateLabel(new Date(nextAuditionRow.date), timeZone),
          daysLeft: Math.max(
            0,
            Math.ceil((new Date(nextAuditionRow.date).getTime() - now.getTime()) / 86400000),
          ),
          progress: FALLBACK_AUDITION.progress,
        }
      : fixtures ? FALLBACK_AUDITION : null,
    activePieces: pieces,
  };
}

const EMPTY_LOG: LogPageData = { weekTotal: "0m", monthTotal: "0m", groups: [] };

export async function getLogPageData(): Promise<LogPageData> {
  const auth = await getServerAuthContext();
  if (!auth) {
    return demoFixturesEnabled()
      ? { weekTotal: HOME_DATA_FALLBACK.weekTotal, monthTotal: "42h 56m", groups: SESSION_FALLBACK }
      : EMPTY_LOG;
  }

  const { supabase, user } = auth;
  const [{ data: sessions }, { data: userRow }] = await Promise.all([
    supabase.from("sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(60),
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const safeSessions = (sessions ?? []) as SessionRow[];
  if (safeSessions.length === 0) {
    return demoFixturesEnabled()
      ? { weekTotal: HOME_DATA_FALLBACK.weekTotal, monthTotal: "42h 56m", groups: SESSION_FALLBACK }
      : EMPTY_LOG;
  }

  const timeZone = (userRow as UserRow | null)?.timezone ?? "America/New_York";
  const now = new Date();
  const weekKeys = new Set(nextSevenDayKeys(now, timeZone));
  const monthPrefix = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const { sessionPieces, pieceIds } = await loadSessionMaps(safeSessions, supabase);
  const { data: pieces } = pieceIds.length > 0
    ? await supabase.from("pieces").select("*").in("id", pieceIds)
    : { data: [] as PieceRow[] };
  const pieceNameById = new Map(((pieces ?? []) as PieceRow[]).map((piece) => [piece.id, piece.name]));

  const weekTotalSeconds = safeSessions.reduce((sum, session) => {
    const key = dayKey(new Date(session.started_at), timeZone);
    return weekKeys.has(key) ? sum + (session.duration_sec ?? 0) : sum;
  }, 0);
  const monthTotalSeconds = safeSessions.reduce((sum, session) => {
    const key = dayKey(new Date(session.started_at), timeZone);
    return key.slice(0, 7) === monthPrefix ? sum + (session.duration_sec ?? 0) : sum;
  }, 0);

  const grouped = new Map<string, FallbackSessionGroup["items"]>();

  for (const session of safeSessions) {
    const date = new Date(session.started_at);
    const label = logDateLabel(date, now, timeZone);
    const sessionPieceNames = sessionPieces
      .filter((entry) => entry.session_id === session.id)
      .map((entry) => pieceNameById.get(entry.piece_id))
      .filter(Boolean) as string[];

    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label)!.push({
      start: clockLabel(date, timeZone),
      duration: formatMinutesAndSeconds(session.duration_sec ?? 0),
      focus:
        session.focus_type === "sight-reading"
          ? "Sight-Reading"
          : session.focus_type
            ? `${session.focus_type.charAt(0).toUpperCase()}${session.focus_type.slice(1)}`
            : "Repertoire",
      pieces: sessionPieceNames.length > 0 ? sessionPieceNames : ["Free practice"],
    });
  }

  return {
    weekTotal: formatSecondsCompact(weekTotalSeconds),
    monthTotal: formatSecondsCompact(monthTotalSeconds),
    groups: Array.from(grouped.entries()).map(([date, items]) => ({ date, items })),
  };
}

export async function getPathwaysData(): Promise<PathwayView[]> {
  const auth = await getServerAuthContext();
  if (!auth) return demoFixturesEnabled() ? FALLBACK_PATHWAYS : [];

  const { supabase, user } = auth;
  const [{ data: pathways }, { data: requirements }, { data: progress }] = await Promise.all([
    supabase.from("pathways").select("*").order("created_at", { ascending: true }),
    supabase.from("pathway_requirements").select("*").order("pathway_id", { ascending: true }).order("position", { ascending: true }),
    supabase.from("pathway_progress").select("*").eq("user_id", user.id),
  ]);

  const safePathways = (pathways ?? []) as PathwayRow[];
  const safeRequirements = (requirements ?? []) as PathwayRequirementRow[];
  const progressByRequirement = new Map(
    ((progress ?? []) as PathwayProgressRow[]).map((entry) => [entry.requirement_id, entry.status]),
  );

  if (safePathways.length === 0 || safeRequirements.length === 0) {
    return demoFixturesEnabled() ? FALLBACK_PATHWAYS : [];
  }

  return safePathways.map((pathway) => {
    const fallback = PATHWAY_FALLBACK.find((entry) => entry.id === pathway.id);
    const pathwayRequirements = safeRequirements
      .filter((requirement) => requirement.pathway_id === pathway.id)
      .map((requirement) => ({
        id: requirement.id,
        label: requirement.label,
        piece: requirement.piece_label ?? "—",
        status: progressByRequirement.get(requirement.id) ?? "todo",
      }));

    const deadlineDate = pathway.deadline_date ? new Date(pathway.deadline_date) : null;
    const daysLeft = deadlineDate
      ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000))
      : null;

    return {
      id: pathway.id,
      region: pathway.region,
      flag: pathway.flag ?? fallback?.flag ?? "🌍",
      name: pathway.name,
      deadline: pathway.deadline_label ?? fallback?.deadline ?? "Continuous",
      daysLeft,
      enrolled: pathway.enrolled_count,
      requirements: pathwayRequirements,
      cohortAvg: fallback?.cohortAvg ?? { weekHours: 0, streak: 0 },
      yourRank: fallback?.yourRank ?? 0,
      cohortSize: fallback?.cohortSize ?? pathway.enrolled_count,
      insight: pathway.insight ?? fallback?.insight ?? "Progress will populate as your cohort data lands.",
    };
  });
}

export async function getGoalsPageData(): Promise<GoalsPageData> {
  const auth = await getServerAuthContext();
  if (!auth) {
    return demoFixturesEnabled()
      ? { goalMin: HOME_DATA_FALLBACK.goalMinutes, auditions: AUDITION_FALLBACK }
      : { goalMin: 60, auditions: [] };
  }

  const { supabase, user } = auth;
  const [{ data: auditions }, { data: userRow }] = await Promise.all([
    supabase.from("auditions").select("*").eq("user_id", user.id).order("date", { ascending: true }),
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const safeAuditions = (auditions ?? []) as AuditionRow[];
  const timeZone = (userRow as UserRow | null)?.timezone ?? "America/New_York";

  const fixtures = demoFixturesEnabled();
  return {
    goalMin: (userRow as UserRow | null)?.daily_goal_min ?? (fixtures ? HOME_DATA_FALLBACK.goalMinutes : 60),
    auditions: safeAuditions.length > 0
      ? safeAuditions.map((audition) => ({
          name: audition.name,
          location: audition.location ?? "TBD",
          date: shortDateLabel(new Date(audition.date), timeZone),
          daysLeft: Math.max(0, Math.ceil((new Date(audition.date).getTime() - Date.now()) / 86400000)),
          progress: FALLBACK_AUDITION.progress,
        }))
      : fixtures ? AUDITION_FALLBACK : [],
  };
}

function formatScheduledLabel(dateString: string | null) {
  if (!dateString) return undefined;

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export async function getRoomsData(): Promise<RoomView[]> {
  const auth = await getServerAuthContext();
  if (!auth) return demoFixturesEnabled() ? ROOM_FALLBACK : [];

  const { supabase } = auth;
  const [{ data: rooms }, { data: seats }] = await Promise.all([
    supabase.from("rooms").select("*").order("created_at", { ascending: false }),
    supabase.from("room_seats").select("*"),
  ]);

  const safeRooms = (rooms ?? []) as RoomRow[];
  const safeSeats = (seats ?? []) as RoomSeatRow[];
  if (safeRooms.length === 0) return demoFixturesEnabled() ? ROOM_FALLBACK : [];

  const hostIds = Array.from(new Set(safeRooms.map((room) => room.host_id)));
  const { data: hosts } = hostIds.length > 0
    ? await supabase.from("profiles").select("id, display_name").in("id", hostIds)
    : { data: [] as UserRow[] };
  const hostNameById = new Map(((hosts ?? []) as UserRow[]).map((row) => [row.id, row.display_name ?? "Host"]));
  const seatCountByRoomId = safeSeats.reduce((map, seat) => {
    map.set(seat.room_id, (map.get(seat.room_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  return safeRooms.map((room) => {
    const fallback = ROOM_FALLBACK.find((entry) => entry.name === room.name);
    const count = seatCountByRoomId.get(room.id) ?? 0;
    const scheduled = formatScheduledLabel(room.scheduled_for);
    const live = room.is_open && (!room.scheduled_for || new Date(room.scheduled_for) <= new Date());

    return {
      id: room.id,
      name: room.name,
      host: hostNameById.get(room.host_id) ?? fallback?.host ?? "Host",
      region: room.region ?? fallback?.region ?? "🌍",
      count,
      max: room.max_seats,
      focus: room.focus ?? fallback?.focus ?? "Practice",
      piece: room.piece_label ?? fallback?.piece ?? "Open repertoire",
      live,
      mood: fallback?.mood ?? "focused",
      scheduled,
    };
  });
}
