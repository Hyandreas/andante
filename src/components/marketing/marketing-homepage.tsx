"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "./homepage.css";

// The marketing homepage is a single scroll-driven 3D experience ("The Living
// Score"). The copy below is real DOM (server-rendered for SEO + a11y); the
// WebGL engine in ./living-score.ts is dynamically imported on mount so `three`
// stays out of the initial route bundle.
export function MarketingHomepage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Mirror the app's reduced-motion preference onto the root so the engine
    // and CSS can honor it, and dim the page background while mounted.
    const motion = document.documentElement.getAttribute("data-motion");
    if (motion) root.setAttribute("data-motion", motion);
    document.body.classList.add("andante-marketing-body");

    // Progressive enhancement: the copy is server-rendered and visible by
    // default. The WebGL engine is an enhancement on top. If it can't run
    // (no WebGL support, blocked, or it throws), fall back to a static,
    // readable scrolling document so the page is never an empty black void.
    const fallback = () => rootRef.current?.classList.add("hp-static");

    let webglOk = false;
    try {
      const test = document.createElement("canvas");
      webglOk = !!(
        test.getContext("webgl2") ||
        test.getContext("webgl") ||
        test.getContext("experimental-webgl")
      );
    } catch {
      webglOk = false;
    }

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    if (!webglOk) {
      fallback();
    } else {
      import("./living-score")
        .then((mod) => {
          if (cancelled || !rootRef.current) return;
          cleanup = mod.startLivingScore(rootRef.current);
        })
        .catch((err) => {
          console.error("Failed to load the living-score engine", err);
          fallback();
        });
    }

    return () => {
      cancelled = true;
      cleanup?.();
      document.body.classList.remove("andante-marketing-body");
    };
  }, []);

  return (
    <div className="andante-homepage" ref={rootRef}>
      <canvas className="hp-gl" aria-hidden="true" />
      <div className="hp-vignette" aria-hidden="true" />

      <nav className="hp-nav">
        <Link href="/" className="hp-nav-brand">
          <span className="hp-nav-mark" aria-hidden="true" />
          <span>Andante</span>
        </Link>
        <div className="hp-nav-links">
          <a href="#bow">Practice log</a>
          <a href="#pillars">Tools</a>
          <a href="#live">Rooms</a>
          <a href="#voices">Students</a>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="hp-nav-actions">
          <Link href="/login" className="hp-nav-login">Log in</Link>
          <Link href="/signup" className="hp-nav-cta">Sign up</Link>
        </div>
      </nav>

      <div className="hp-orb" aria-hidden="true">
        <svg viewBox="0 0 28 28">
          <circle className="bg" cx="14" cy="14" r="12" fill="none" strokeWidth="1.5" />
          <circle className="fg" id="hp-orbFg" cx="14" cy="14" r="12" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="hp-overlays">
        <section className="ov ov-center" data-act="overture">
          <div className="ov-stack">
            <div className="eyebrow">Practice tracking for audition season</div>
            <h1 className="wordmark" aria-label="Andante">
              {"Andante".split("").map((c, i) => (
                <span className="ch" key={i}>{c}</span>
              ))}
            </h1>
            <div className="sub">
              <span className="breath-dot" aria-hidden="true" />
              <span>Timers, repertoire, recordings, and deadlines in one place.</span>
            </div>
          </div>
        </section>

        <section className="ov ov-center" data-act="bow">
          <div className="ov-stack narrow">
            <div className="kicker center">II · The practice log</div>
            <h2 className="display">
              Turn each hour into<br />
              <em>a record you can use.</em>
            </h2>
            <p className="lede">
              Every session — tempo, repetitions, the bars that fought back — captured the moment you set the
              instrument down.
            </p>
          </div>
        </section>

        <section className="ov ov-left" data-act="pillars">
          <div className="ov-inner">
            <div className="kicker">III · Practice tools</div>
            <h2 className="display sm">
              Six tools.<br />One practice log.
            </h2>
            <div className="tool-slot">
              <div className="tool-index" id="hp-toolIndex">i — vi</div>
              <h3 className="tool-title" id="hp-toolTitle">
                Practice <em>rooms.</em>
              </h3>
              <p className="tool-desc" id="hp-toolDesc">
                Join a focused room with timers on and microphones off. See who else is working without opening a chat.
              </p>
              <div className="tool-dots" id="hp-toolDots">
                <span className="on" /><span /><span /><span /><span /><span />
              </div>
            </div>
          </div>
        </section>

        <section className="ov ov-center" data-act="nave">
          <div className="ov-stack">
            <h2 className="display lg">
              One hour at a time.<br />
              <em>One honest log.</em>
            </h2>
            <div className="epigraph">what changed · what still needs work</div>
          </div>
        </section>

        <section className="ov ov-left" data-act="live">
          <div className="ov-inner">
            <div className="kicker">V · Practice rooms</div>
            <h2 className="display sm">
              Work near other players<br />
              <em>without the noise.</em>
            </h2>
            <p className="lede">
              Rooms show who&apos;s in, how long they&apos;ve been there, and what they&apos;re working on. The timer
              stays on screen. No chat.
            </p>
            <div className="tally">
              <span className="num">
                <span id="hp-liveCount">2,847</span>
                <span className="live-pill"><i aria-hidden="true" />Live</span>
              </span>
              <div className="tally-label">players in focused rooms right now</div>
            </div>
          </div>
        </section>

        <section className="ov ov-center" data-act="voices">
          <div className="ov-stack wide">
            <div className="kicker center">VI · Voices</div>
            <blockquote className="quote">
              <span className="qmark">“</span>
              <span id="hp-quoteText">My teacher can see the work between lessons.</span>
            </blockquote>
            <div className="credit" id="hp-quoteCredit">Sera, 17 · viola, Toronto</div>
          </div>
        </section>

        <section className="ov ov-center" data-act="begin">
          <div className="ov-stack">
            <h2 className="display xl"><em>Begin.</em></h2>
            <p className="lede">Add a piece, set the next deadline, and log the first session today.</p>
            <div className="ctas">
              <Link className="cta-primary" href="/signup">Track your first session</Link>
              <Link className="cta-ghost" href="/pricing">View pricing</Link>
            </div>
            <p className="login-hint">
              Already practicing? <Link href="/login">Log in →</Link>
            </p>
          </div>
          <div className="signoff">
            <span>Andante · 2026</span>
            <em>poco a poco</em>
            <span className="signoff-links">
              <Link href="/privacy">Privacy</Link>
              <span aria-hidden="true">·</span>
              <Link href="/pricing">Pricing</Link>
            </span>
          </div>
        </section>
      </div>

      <div className="scroll-cue">Scroll</div>

      <button className="hp-sound" id="hp-sound" type="button" aria-pressed="false" aria-label="Toggle sound">
        <span className="hp-sound-eq" aria-hidden="true"><i /><i /><i /></span>
        <span className="hp-sound-label">Sound</span>
      </button>

      <div className="hp-grain" aria-hidden="true" />

      <main className="scroller" aria-hidden="true">
        <section id="top" style={{ height: "88vh" }} />
        <section id="bow" style={{ height: "104vh" }} />
        <section id="pillars" style={{ height: "176vh" }} />
        <section id="nave" style={{ height: "96vh" }} />
        <section id="live" style={{ height: "112vh" }} />
        <section id="voices" style={{ height: "96vh" }} />
        <section id="begin" style={{ height: "120vh" }} />
      </main>
    </div>
  );
}
