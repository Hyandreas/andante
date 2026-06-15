"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ThemePreference } from "@/lib/supabase/types";

type ResolvedTheme = "light" | "dark";
type ThemeSetOptions = { animate?: boolean };

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  reducedMotion: boolean;
  setTheme: (theme: ThemePreference, options?: ThemeSetOptions) => void;
  setReducedMotion: (reduced: boolean) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  reducedMotion: false,
  setTheme: () => {},
  setReducedMotion: () => {},
  toggle: () => {},
});

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === "system") return prefersDark() ? "dark" : "light";
  return theme;
}

function syncThemeColorMeta() {
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColor) return;

  const bg = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
  if (bg) themeColor.content = bg;
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  syncThemeColorMeta();
}

function applyTheme(theme: ThemePreference) {
  const resolved = resolveTheme(theme);
  applyResolvedTheme(resolved);
  return resolved;
}

function applyMotion(reduced: boolean) {
  if (reduced) document.documentElement.setAttribute("data-motion", "off");
  else document.documentElement.removeAttribute("data-motion");
}

function shouldReduceMotion(reduced: boolean) {
  return reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function runThemeWave(targetTheme: ResolvedTheme, commitTheme: () => void, onFinish: () => void) {
  const overlay = document.createElement("div");
  overlay.className = "theme-wave-overlay";
  overlay.dataset.themeTarget = targetTheme;
  overlay.setAttribute("aria-hidden", "true");

  let committed = false;
  let finished = false;
  let sweepTimer = 0;
  let exitTimer = 0;

  const cleanup = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(sweepTimer);
    window.clearTimeout(exitTimer);
    overlay.remove();
    onFinish();
  };

  const commitAndFade = () => {
    if (!committed) {
      committed = true;
      commitTheme();
    }

    overlay.classList.add("theme-wave-overlay-exit");
    exitTimer = window.setTimeout(cleanup, 360);
  };

  sweepTimer = window.setTimeout(commitAndFade, 1360);

  overlay.addEventListener("animationend", (event) => {
    if (event.animationName === "themeWaveSweep") commitAndFade();
    if (event.animationName === "themeWaveFade") cleanup();
  });

  document.body.appendChild(overlay);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [reducedMotion, setReducedMotionState] = useState(false);
  const resolvedThemeRef = useRef<ResolvedTheme>("light");
  const reducedMotionRef = useRef(false);
  const isTransitioning = useRef(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as ThemePreference | null;
    const initialTheme: ThemePreference =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : "system";
    const storedMotion = localStorage.getItem("motion");
    const initialReducedMotion =
      storedMotion === "off" || (storedMotion !== "on" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    setThemeState(initialTheme);
    const initialResolvedTheme = applyTheme(initialTheme);
    resolvedThemeRef.current = initialResolvedTheme;
    reducedMotionRef.current = initialReducedMotion;
    setResolvedTheme(initialResolvedTheme);
    setReducedMotionState(initialReducedMotion);
    applyMotion(initialReducedMotion);

  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateResolved = () => {
      const resolved = resolveTheme(theme);
      resolvedThemeRef.current = resolved;
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };
    media.addEventListener("change", updateResolved);
    return () => media.removeEventListener("change", updateResolved);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference, options: ThemeSetOptions = {}) => {
    const shouldAnimate = options.animate !== false;
    const resolved = resolveTheme(next);
    const commitTheme = () => {
      const updateState = () => {
        setThemeState(next);
        resolvedThemeRef.current = resolved;
        setResolvedTheme(resolved);
      };

      localStorage.setItem("theme", next);
      updateState();
      applyResolvedTheme(resolved);
    };

    if (isTransitioning.current) return;

    if (!shouldAnimate || resolved === resolvedThemeRef.current || shouldReduceMotion(reducedMotionRef.current)) {
      commitTheme();
      return;
    }

    isTransitioning.current = true;
    document.documentElement.setAttribute("data-theme-transition", "wave");

    runThemeWave(resolved, commitTheme, () => {
      document.documentElement.removeAttribute("data-theme-transition");
      isTransitioning.current = false;
    });
  }, []);

  const setReducedMotion = useCallback((next: boolean) => {
    localStorage.setItem("motion", next ? "off" : "on");
    reducedMotionRef.current = next;
    setReducedMotionState(next);
    applyMotion(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    reducedMotion,
    setTheme,
    setReducedMotion,
    toggle: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  }), [theme, resolvedTheme, reducedMotion, setReducedMotion, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
