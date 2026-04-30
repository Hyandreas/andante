import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://andante.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing"],
      disallow: [
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
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
