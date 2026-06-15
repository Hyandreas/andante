import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";

interface MediaWikiSearchResult {
  pageid: number;
  title: string;
  snippet?: string;
  timestamp?: string;
}

interface MediaWikiSearchResponse {
  query?: {
    search?: MediaWikiSearchResult[];
  };
}

interface MediaWikiInfoResponse {
  query?: {
    pages?: Record<string, {
      pageid: number;
      title: string;
      fullurl?: string;
    }>;
  };
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

const IMSLP_HEADERS = {
  "User-Agent": "Andante/0.1 IMSLP metadata search; contact=hello@andante.app",
};

// Words that hurt IMSLP's full-text search (its work titles are like
// "Violin Sonata No.1, Op.78 (Brahms, Johannes)"). We drop catalogue tokens,
// numbers and stopwords, then try progressively shorter queries because the
// search AND-matches and over-constrains on long literal titles.
const STOPWORDS = new Set(["for", "and", "the", "in", "of", "a", "an", "de", "la", "le", "et", "und", "fur", "für"]);
const CATALOG = new Set(["no", "op", "opus", "bwv", "k", "kv", "d", "woo", "hob", "rv", "s", "l", "b", "m"]);

function queryCandidates(raw: string): string[] {
  const tokens = raw
    .replace(/[.,()'"#:_/-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/^\d+$/.test(t))
    .filter((t) => !CATALOG.has(t.toLowerCase()))
    .filter((t) => !STOPWORDS.has(t.toLowerCase()));

  const candidates: string[] = [];
  const push = (c: string) => {
    const v = c.trim();
    if (v.length >= 2 && !candidates.includes(v)) candidates.push(v);
  };

  push(raw);                                  // exact (handles "Brahms Op.78")
  push(tokens.join(" "));                      // all significant words
  for (let n = tokens.length - 1; n >= 2; n--) {
    push(tokens.slice(0, n).join(" "));        // progressively shorter
  }
  if (tokens.length) push(tokens[0]);          // last resort

  return candidates.slice(0, 5);
}

async function runImslpSearch(q: string): Promise<MediaWikiSearchResult[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    list: "search",
    srnamespace: "0",
    srlimit: "8",
    srsearch: q,
  });
  const res = await fetch(`https://imslp.org/api.php?${params}`, {
    headers: IMSLP_HEADERS,
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as MediaWikiSearchResponse;
  return json.query?.search ?? [];
}

export async function GET(req: Request) {
  // IMSLP search hits only public MediaWiki data — no user data is read. In
  // demo mode (no Supabase) the first-run tutorial auto-looks-up sheet music
  // for pieces a user adds, so we allow unauthenticated requests there. With a
  // real project configured we still require sign-in.
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to search IMSLP." }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Try cleaned, progressively shorter queries until IMSLP returns matches.
  let hits: MediaWikiSearchResult[] = [];
  for (const candidate of queryCandidates(q)) {
    hits = await runImslpSearch(candidate);
    if (hits.length > 0) break;
  }

  if (hits.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const infoParams = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "info",
    inprop: "url",
    pageids: hits.map((hit) => hit.pageid).join("|"),
  });

  const infoResponse = await fetch(`https://imslp.org/api.php?${infoParams}`, {
    headers: IMSLP_HEADERS,
    next: { revalidate: 3600 },
  });

  const infoJson = infoResponse.ok
    ? (await infoResponse.json() as MediaWikiInfoResponse)
    : null;
  const pages = infoJson?.query?.pages ?? {};

  return NextResponse.json({
    results: hits.map((hit) => {
      const info = pages[String(hit.pageid)];
      return {
        pageId: hit.pageid,
        title: hit.title,
        snippet: stripHtml(hit.snippet),
        sourceUrl: info?.fullurl ?? `https://imslp.org/wiki/${encodeURIComponent(hit.title.replaceAll(" ", "_"))}`,
        sourceName: "IMSLP",
        rightsNote: "Import only public-domain or openly licensed material you are allowed to use.",
        lastIndexedAt: hit.timestamp ?? null,
      };
    }),
  });
}
