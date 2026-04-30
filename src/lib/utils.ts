import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const formatHrMin = (minutes: number): string => {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

export const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

// Round-up clamped to [lo, hi]
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
