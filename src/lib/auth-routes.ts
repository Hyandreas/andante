export const DEFAULT_AUTH_DESTINATION = "/home";

const AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sanitizeNextPath(next: string | null | undefined, fallback = DEFAULT_AUTH_DESTINATION) {
  const value = next?.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "https://andante.local");
    if (url.origin !== "https://andante.local") return fallback;
    if (AUTH_PATHS.has(url.pathname)) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Re-check the RESOLVED path: inputs like "/..//evil.com" pass the leading
    // "//" guard above but normalize to a protocol-relative "//evil.com", which
    // a client router would treat as an off-origin redirect. Reject those.
    if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

export function withLoginParams(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/login?${query}` : "/login";
}
