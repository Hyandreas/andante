import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env-server";
import type { Database } from "@/lib/supabase/types";

export function getSupabaseAdminClient() {
  if (!serverEnv.supabaseServiceRoleKey) return null;
  return createClient<Database>(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
