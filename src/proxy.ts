import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { sanitizeNextPath } from "@/lib/auth-routes";
import { env, isSupabaseConfigured, productionRequiresSupabase } from "@/lib/env";
import { isPaidEntitlement } from "@/lib/entitlement";
import type { Database } from "@/lib/supabase/types";

const PROTECTED = ["/home", "/pathways", "/rooms", "/pieces", "/log", "/goals", "/loop", "/recordings", "/teacher", "/session", "/onboarding", "/settings", "/leaderboard", "/digest-preview"];
const PRO_ONLY = ["/pathways", "/rooms", "/recordings", "/leaderboard", "/loop"];
const AUTH_ONLY = ["/login", "/signup"];
const ONBOARDING = "/onboarding";

type AuthCookieEntry = {
  name: string;
  value: string;
  options: CookieOptions;
};

function matchesPath(path: string, roots: string[]) {
  return roots.some((root) => path === root || path.startsWith(root + "/"));
}

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const path = req.nextUrl.pathname;
  const requestedPath = `${path}${req.nextUrl.search}`;
  const isProtected = matchesPath(path, PROTECTED);
  const isProOnly = matchesPath(path, PRO_ONLY);
  const isAuthOnly = AUTH_ONLY.includes(path);
  const isOnboarding = matchesPath(path, [ONBOARDING]);
  let authCookieEntries: AuthCookieEntry[] = [];
  let authHeaders: Record<string, string> = {};

  if (productionRequiresSupabase() && (isProtected || isAuthOnly)) {
    return new NextResponse("App authentication is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Without a real Supabase project, every route renders unauthenticated —
  // that's the right behavior for design-only previews.
  if (!isSupabaseConfigured()) return res;

  const applyAuthStorage = (target: NextResponse) => {
    for (const { name, value, options } of authCookieEntries) {
      target.cookies.set(name, value, options);
    }
    for (const [name, value] of Object.entries(authHeaders)) {
      target.headers.set(name, value);
    }
  };

  const redirectTo = (pathname: string) => {
    const url = req.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";

    const redirect = NextResponse.redirect(url);
    applyAuthStorage(redirect);
    return redirect;
  };

  const redirectToLogin = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", sanitizeNextPath(requestedPath));

    const redirect = NextResponse.redirect(url);
    applyAuthStorage(redirect);
    return redirect;
  };

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (entries, headers) => {
        authCookieEntries = entries;
        authHeaders = headers;

        for (const { name, value } of entries) {
          req.cookies.set(name, value);
        }

        res = NextResponse.next({ request: req });
        for (const { name, value, options } of entries) {
          res.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          res.headers.set(name, value);
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && isProtected) {
    return redirectToLogin();
  }

  if (user && (isAuthOnly || isProtected)) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    const isOnboarded = Boolean(profile?.onboarded_at);

    if (isAuthOnly) {
      return redirectTo(isOnboarded ? "/home" : ONBOARDING);
    }

    if (isOnboarding && isOnboarded) {
      return redirectTo("/home");
    }

    if (isProtected && !isOnboarding && !isOnboarded) {
      return redirectTo(ONBOARDING);
    }

    if (isProtected && isProOnly && isOnboarded) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan,status,period_end")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isPaidEntitlement(subscription, Date.now())) {
        return redirectTo("/pricing");
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png|manifest.json|.*\\.(?:png|jpg|svg|webp|woff2)$).*)"],
};
