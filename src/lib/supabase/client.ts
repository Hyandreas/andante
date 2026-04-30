"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (_client) return _client;
  _client = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return _client;
}
