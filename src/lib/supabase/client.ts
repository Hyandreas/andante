"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Sole browser-side Supabase entry point — all client-side DB/auth calls go through here.
// Add request tracing, token injection, or retry logic here if needed.
export function getSupabaseBrowserClient() {
  if (_client) return _client;
  _client = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return _client;
}
