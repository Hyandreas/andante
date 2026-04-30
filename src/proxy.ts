import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

const PROTECTED = ["/home", "/pathways", "/rooms", "/pieces", "/log", "/goals", "/loop", "/recordings", "/teacher", "/session", "/onboarding", "/settings", "/leaderboard"];
const AUTH_ONLY = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const path = req.nextUrl.pathname;

  // Without a real Supabase project, every route renders unauthenticated —
  // that's the right behavior for design-only previews.
  if (!isSupabaseConfigured()) return res;

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (entries) => {
        for (const { name, value, options } of entries) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY.includes(path)) {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png|manifest.json|.*\\.(?:png|jpg|svg|webp|woff2)$).*)"],
};
