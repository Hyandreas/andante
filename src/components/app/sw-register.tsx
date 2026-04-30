"use client";

import { useEffect } from "react";
import { drain } from "@/lib/offline-sessions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { FocusType } from "@/lib/supabase/types";

const VALID_FOCUS: ReadonlyArray<FocusType> = ["repertoire", "scales", "etudes", "sight-reading"];

async function flushPendingSessions() {
  if (!isSupabaseConfigured() || !navigator.onLine) return;

  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const pending = await drain();
  if (pending.length === 0) return;

  for (const s of pending) {
    const focus = VALID_FOCUS.includes(s.focusType as FocusType)
      ? (s.focusType as FocusType)
      : null;

    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        started_at: new Date(s.startedAt).toISOString(),
        ended_at: new Date(s.endedAt).toISOString(),
        duration_sec: s.durationSec,
        focus_type: focus,
        notes: s.notes || null,
      })
      .select("id")
      .single();

    if (error || !session) continue;

    if (s.pieceId) {
      await supabase.from("session_pieces").insert({
        session_id: session.id,
        piece_id: s.pieceId,
      });
    }
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    void flushPendingSessions();
    window.addEventListener("online", flushPendingSessions);
    return () => window.removeEventListener("online", flushPendingSessions);
  }, []);

  return null;
}
