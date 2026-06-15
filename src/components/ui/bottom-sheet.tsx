"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) { setRender(true); setClosing(false); }
    else if (render) {
      setClosing(true);
      const t = setTimeout(() => { setRender(false); setClosing(false); }, 220);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  // Focus the panel on open, restore focus to the trigger on close, and let
  // Escape request a close (the consumer's onClose owns any mid-save guard).
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    // Defer until after the panel mounts/paints so focus lands reliably.
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to whatever was focused before the sheet opened.
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!render) return null;

  const visible = open && !closing;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 50,
          opacity: visible ? 1 : 0,
          transition: "opacity 240ms ease-out",
          pointerEvents: visible ? "auto" : "none",
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          background: "var(--color-bg)",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          zIndex: 60,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: closing ? "transform 220ms ease-in" : "transform 300ms var(--ease-out-expo)",
          padding: "12px 24px 32px",
          maxHeight: "80vh",
          overflowY: "auto",
          outline: "none",
        }}
      >
        <div style={{
          width: 32, height: 4, background: "var(--color-border)",
          borderRadius: 999, margin: "0 auto 16px",
        }} />
        {title && <div className="t-section" style={{ marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </>
  );
}
