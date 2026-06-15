"use client";

// Hydrates the first-run store once on mount and exposes a convenience hook.
// We don't need React context — the Zustand store is the shared source — but
// this component owns the single hydrate() call and is the obvious mount point.

import { useEffect, type ReactNode } from "react";
import { useFirstRunStore } from "@/lib/first-run/store";

export function FirstRunProvider({ children }: { children: ReactNode }) {
  const hydrate = useFirstRunStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <>{children}</>;
}

/** Convenience hook: the whole store (data + hydration flag + actions).
 *  Returning the store object directly (not a fresh literal) keeps the
 *  snapshot reference stable per update, avoiding zustand's object-selector
 *  re-render loop. */
export function useFirstRun() {
  return useFirstRunStore();
}
