// Local-only analytics for the first-run funnel. No third-party SDK — events
// are appended to localStorage so the funnel can be inspected now and flushed
// to a real provider later. Safe to call on the server (no-ops) and before the
// store hydrates.

const EVENTS_KEY = "andante.firstrun.events.v1";
const MAX_EVENTS = 500;

export interface FirstRunEvent {
  t: number;
  event: string;
  props?: Record<string, unknown>;
}

function read(): FirstRunEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as FirstRunEvent[]) : [];
  } catch {
    return [];
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const events = read();
    events.push({ t: Date.now(), event, props });
    // Keep the log bounded so it can't grow unbounded across many sessions.
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
    if (process.env.NODE_ENV !== "production") {
       
      console.debug(`[first-run] ${event}`, props ?? "");
    }
  } catch {
    // Analytics must never break the flow.
  }
}

export function getEvents(): FirstRunEvent[] {
  return read();
}

export function clearEvents() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EVENTS_KEY);
  } catch {
    // ignore
  }
}
