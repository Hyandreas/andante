"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { SheetMusicFileView, SheetMusicView } from "@/lib/sheet-music";

interface SheetMusicViewerProps {
  sheetMusic: SheetMusicView | null;
  compact?: boolean;
}

type ViewerState = "idle" | "loading" | "ready" | "error";

// Only render URLs with a safe scheme into <iframe src> / <img src>. Blocks
// javascript:/data: (and anything malformed) that could otherwise come from a
// stored `external_url` and execute in the app origin.
function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "blob:";
  } catch {
    return false;
  }
}

async function signedUrlFor(file: SheetMusicFileView) {
  if (file.externalUrl) return isSafeUrl(file.externalUrl) ? file.externalUrl : null;
  if (!file.storageBucket || !file.storagePath || !isSupabaseConfigured()) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(file.storageBucket)
    .createSignedUrl(file.storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function SheetMusicViewer({ sheetMusic, compact = false }: SheetMusicViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<{ clear?: () => void } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<ViewerState>("idle");
  const [error, setError] = useState<string | null>(null);

  const primaryFile = useMemo(() => {
    if (!sheetMusic) return null;
    return (
      sheetMusic.files.find((file) => file.kind === "musicxml") ??
      sheetMusic.files.find((file) => file.kind === "pdf") ??
      sheetMusic.files.find((file) => file.kind === "image") ??
      null
    );
  }, [sheetMusic]);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    osmdRef.current?.clear?.();
    if (containerRef.current) containerRef.current.innerHTML = "";

    if (!primaryFile) {
      setState("idle");
      return;
    }

    void (async () => {
      try {
        setState("loading");
        const nextUrl = await signedUrlFor(primaryFile);
        if (cancelled) return;
        setUrl(nextUrl);

        if (primaryFile.kind !== "musicxml") {
          setState("ready");
          return;
        }

        if (!nextUrl || !containerRef.current) {
          throw new Error("MusicXML file is not available.");
        }

        const xml = await fetch(nextUrl).then((response) => {
          if (!response.ok) throw new Error(`Could not load MusicXML (${response.status}).`);
          return response.text();
        });
        if (cancelled || !containerRef.current) return;

        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          drawingParameters: "compacttight",
        });
        await osmd.load(xml);
        if (cancelled) return;
        osmd.render();
        osmdRef.current = osmd;
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [primaryFile]);

  if (!sheetMusic) {
    return (
      <div style={{
        minHeight: compact ? 220 : 420,
        border: "0.5px solid var(--color-border)",
        borderRadius: 8,
        background: "var(--color-card-fill)",
        display: "grid",
        placeItems: "center",
        color: "var(--color-text-muted)",
      }}>
        <div style={{ display: "grid", placeItems: "center", gap: 10 }}>
          <Icon name="music" size={22} />
          <div className="t-meta">No sheet music selected</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      border: "0.5px solid var(--color-border)",
      borderRadius: 8,
      background: "var(--color-bg)",
      minHeight: compact ? 260 : 520,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      <div className="row-between" style={{
        padding: "12px 14px",
        borderBottom: "0.5px solid var(--color-border)",
        gap: 14,
      }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-card-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sheetMusic.title}
          </div>
          <div className="t-meta" style={{ marginTop: 2 }}>
            {[sheetMusic.composer, sheetMusic.sourceName ?? sheetMusic.origin].filter(Boolean).join(" · ")}
          </div>
        </div>
        {state === "loading" && <div className="t-micro">Loading</div>}
        {state === "ready" && <Icon name="check" size={16} />}
      </div>

      <div style={{ flex: 1, background: "var(--color-card-fill)", overflow: "auto" }}>
        {!primaryFile && (
          <div style={{ minHeight: compact ? 180 : 440, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
            <div>
              <div className="t-card-label">Source attached</div>
              <div className="t-meta" style={{ marginTop: 6 }}>
                {sheetMusic.sourceUrl ? "Open the source page from the session setup." : "No renderable file has been added yet."}
              </div>
            </div>
          </div>
        )}

        {primaryFile?.kind === "pdf" && url && (
          <iframe
            title={sheetMusic.title}
            src={url}
            style={{ width: "100%", height: compact ? 280 : 560, border: 0, display: "block", background: "white" }}
          />
        )}

        {primaryFile?.kind === "image" && url && (
          <div style={{ display: "grid", placeItems: "start center", padding: compact ? 12 : 20 }}>
            <img
              src={url}
              alt={sheetMusic.title}
              style={{ maxWidth: "100%", height: "auto", borderRadius: 6, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}
            />
          </div>
        )}

        {primaryFile?.kind === "musicxml" && (
          <div style={{ padding: compact ? 8 : 16, background: "white", color: "#111", minHeight: compact ? 220 : 480 }}>
            <div ref={containerRef} />
          </div>
        )}

        {state === "error" && (
          <div style={{ padding: 18 }}>
            <div className="t-card-label">Could not render this score</div>
            <div className="t-meta" style={{ marginTop: 4 }}>{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
