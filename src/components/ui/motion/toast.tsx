"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  tone?: "default" | "success" | "error";
  duration: number;
}

interface ToastContextValue {
  show: (message: string, options?: { tone?: ToastItem["tone"]; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/**
 * Lightweight toast layer. Wrap a tree in <ToastProvider/> once and call
 * useToast().show(message) from anywhere inside it. Tokens-respecting,
 * single-stack at bottom-center, no external deps.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback<ToastContextValue["show"]>((message, options) => {
    const id = ++idRef.current;
    const duration = options?.duration ?? 2400;
    setItems((prev) => [...prev, { id, message, tone: options?.tone ?? "default", duration }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const m = window.setTimeout(() => setMounted(true), 8);
    const exit = window.setTimeout(() => setExiting(true), Math.max(200, item.duration - 240));
    return () => {
      window.clearTimeout(m);
      window.clearTimeout(exit);
    };
  }, [item.duration]);

  return (
    <div
      role="status"
      style={{
        background: "var(--color-text-primary)",
        color: "var(--color-bg)",
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 13,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        opacity: exiting ? 0 : mounted ? 1 : 0,
        transform: exiting
          ? "translateY(8px)"
          : mounted
            ? "translateY(0)"
            : "translateY(8px)",
        transition: "opacity 220ms var(--ease-out-expo), transform 220ms var(--ease-out-expo)",
        pointerEvents: "auto",
      }}
    >
      {item.message}
    </div>
  );
}
