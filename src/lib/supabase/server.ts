import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./types";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          for (const { name, value, options } of entries) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll is a no-op in Server Components; that's fine.
        }
      },
    },
  });
}
