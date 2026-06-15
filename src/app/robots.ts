import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://andante.app").replace(/\/$/, "");

// Public, indexable surface. Everything else (the signed-in app + APIs) is private.
const allow = ["/", "/pricing", "/privacy", "/llms.txt"];
const disallow = [
  "/api/",
  "/digest-preview",
  "/goals",
  "/home",
  "/leaderboard",
  "/log",
  "/login",
  "/loop",
  "/onboarding",
  "/pathways",
  "/pieces",
  "/recordings",
  "/rooms",
  "/session",
  "/signup",
  "/teacher",
];

// AI search / assistant crawlers we explicitly welcome on the public pages, so
// Andante can be discovered and cited (while the private app stays excluded).
const aiBots = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow, disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow, disallow })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
