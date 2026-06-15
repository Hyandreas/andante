import { normalizeEmail } from "@/lib/auth-routes";

const AUTH_MEMORY_KEY = "andante.auth.memory.v1";
const AUTH_MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthMemory = {
  email: string;
  knownAccount: true;
  rememberedAt: string;
  expiresAt: string;
};

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function expiresAt(ms: number) {
  return new Date(ms + AUTH_MEMORY_TTL_MS).toISOString();
}

export function readAuthMemory(): AuthMemory | null {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(AUTH_MEMORY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthMemory>;
    const email = typeof parsed.email === "string" ? normalizeEmail(parsed.email) : "";
    const expires = typeof parsed.expiresAt === "string" ? Date.parse(parsed.expiresAt) : Number.NaN;

    if (!email || parsed.knownAccount !== true || !Number.isFinite(expires) || expires <= Date.now()) {
      clearAuthMemory();
      return null;
    }

    return {
      email,
      knownAccount: true,
      rememberedAt: typeof parsed.rememberedAt === "string" ? parsed.rememberedAt : new Date().toISOString(),
      expiresAt: new Date(expires).toISOString(),
    };
  } catch {
    clearAuthMemory();
    return null;
  }
}

export function rememberAuthEmail(email: string) {
  if (!hasStorage()) return;

  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const now = Date.now();
  const memory: AuthMemory = {
    email: normalized,
    knownAccount: true,
    rememberedAt: new Date(now).toISOString(),
    expiresAt: expiresAt(now),
  };

  window.localStorage.setItem(AUTH_MEMORY_KEY, JSON.stringify(memory));
}

export function clearAuthMemory() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(AUTH_MEMORY_KEY);
}

export function isRememberedAccount(email: string) {
  const memory = readAuthMemory();
  return Boolean(memory && memory.email === normalizeEmail(email));
}
