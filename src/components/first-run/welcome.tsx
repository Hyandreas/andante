"use client";

// Stage 1: a single calm screen. No app chrome. Sets the "one room that grows"
// tone before we ask anything.

import { useEffect } from "react";
import Image from "next/image";
import { track } from "@/lib/first-run/analytics";
import { useFirstRun } from "./first-run-provider";

export function Welcome() {
  const { goToStage } = useFirstRun();

  useEffect(() => {
    track("welcome_viewed");
  }, []);

  return (
    <div
      className="screen-enter-left"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            marginBottom: 28,
            animation: "revealUp 640ms var(--ease-out-expo) both",
          }}
        >
          <Image src="/logo-black.png" alt="Andante" width={40} height={40} style={{ borderRadius: 9 }} className="logo-light" />
          <Image src="/logo-white.png" alt="Andante" width={40} height={40} style={{ borderRadius: 9 }} className="logo-dark" />
        </div>

        <div className="t-micro" style={{ marginBottom: 14, animation: "revealUp 640ms var(--ease-out-expo) 60ms both" }}>
          WELCOME TO ANDANTE
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: -1,
            lineHeight: 1.1,
            margin: 0,
            animation: "revealUp 640ms var(--ease-out-expo) 120ms both",
          }}
        >
          Let&rsquo;s set up<br />your studio.
        </h1>
        <p
          className="t-meta"
          style={{ marginTop: 14, maxWidth: 320, animation: "revealUp 640ms var(--ease-out-expo) 200ms both" }}
        >
          We&rsquo;ll start with one quiet room and a timer. The rest unlocks as you go &mdash; no overwhelm.
        </p>

        <button
          className="cta"
          onClick={() => goToStage("onboarding")}
          style={{ marginTop: 36, width: "100%", maxWidth: 280, animation: "revealUp 640ms var(--ease-out-expo) 280ms both" }}
        >
          Get started
        </button>
        <div className="t-micro" style={{ marginTop: 16, opacity: 0.7, animation: "revealUp 640ms var(--ease-out-expo) 340ms both" }}>
          TAKES ABOUT A MINUTE
        </div>
      </div>
    </div>
  );
}
