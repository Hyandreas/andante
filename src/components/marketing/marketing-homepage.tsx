"use client";

import Link from "next/link";
import { Fragment, type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./homepage.css";

// ─── SCROLL HOOKS ────────────────────────────────────────────────────────
// Read scrollY each frame; expose helpers to compute per-act progress.
function useScrollProgress() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => { setY(window.scrollY || document.documentElement.scrollTop); raf = 0; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return y;
}

// Returns local progress 0..1 for an element with `position: relative`
// height = N * 100vh.  0 when its top hits viewport top, 1 when its bottom
// reaches viewport bottom (exclusive of the trailing 100vh so the sticky
// content stays put for the last viewport).
function useActProgress(ref: RefObject<HTMLElement | null>, scrollY: number) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const top = rect.top + scrollY;
    const total = rect.height - window.innerHeight;
    if (total <= 0) { setP(scrollY >= top ? 1 : 0); return; }
    const local = Math.min(1, Math.max(0, (scrollY - top) / total));
    setP(local);
  }, [ref, scrollY]);
  return p;
}

// Easing
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seededUnit = (seed: number) => {
  const wave = Math.sin(seed * 12.9898) * 43758.5453;
  return wave - Math.floor(wave);
};
// Map t in [a,b] to 0..1 with optional easing
function range(t: number, a: number, b: number, ease = (x: number) => x) {
  if (t <= a) return 0; if (t >= b) return 1;
  return ease((t - a) / (b - a));
}

// ─── NAV + SCROLL ORB ────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        <span className="nav-mark"></span>
        <span>Andante</span>
      </Link>
      <div className="nav-links">
        <a href="#bow">Practice log</a>
        <a href="#pillars">Tools</a>
        <a href="#pulse">Rooms</a>
        <a href="#voices">Students</a>
        <Link href="/pricing">Pricing</Link>
      </div>
      <Link href="/signup" className="nav-cta">Sign up</Link>
    </nav>
  );
}

function ScrollOrb({ progress }: { progress: number }) {
  const r = 12, c = 2 * Math.PI * r;
  return (
    <div className="scroll-orb">
      <svg viewBox="0 0 28 28">
        <circle className="bg" cx="14" cy="14" r={r} fill="none" strokeWidth="1.5" />
        <circle className="fg" cx="14" cy="14" r={r} fill="none" strokeWidth="1.5"
                strokeDasharray={c} strokeDashoffset={c * (1 - progress)} strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ActsRail({ active }: { active: number }) {
  const acts = ["Overture", "The Bow", "Six Pillars", "The Nave", "Live", "Voices", "Begin"];
  return (
    <div className="acts-rail">
      {acts.map((a, i) => (
        <div key={a} className={`row ${i === active ? "active" : ""}`}>
          <span className="tick" />
          <span>{a}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ACT 1 — OVERTURE ────────────────────────────────────────────────────
function Act1() {
  // Wordmark stagger animation handled in CSS via animation-delay
  const letters = "Andante".split("");
  const stardust = useMemo(() =>
    Array.from({ length: 64 }).map((_, index) => {
      const variant = index % 3;
      return {
        l: (seededUnit(index + 1) * 100).toFixed(2),
        t: (seededUnit(index + 101) * 100).toFixed(2),
        d: (seededUnit(index + 201) * 22).toFixed(2),
        dur: (10 + seededUnit(index + 301) * 18).toFixed(2),
        size: (1 + seededUnit(index + 401) * 2.4).toFixed(2),
        op: (0.35 + seededUnit(index + 501) * 0.6).toFixed(2),
        dx: Math.round(seededUnit(index + 601) * 80 - 40),
        dy: Math.round(seededUnit(index + 701) * -80 - 10),
        variant,
      };
    }), []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  // smooth mouse parallax via rAF lerp
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let raf = 0;
    let tx = 0, ty = 0, x = 0, y = 0;
    const tick = () => {
      tx += (x - tx) * 0.08;
      ty += (y - ty) * 0.08;
      el.style.setProperty("--mx", tx.toFixed(3));
      el.style.setProperty("--my", ty.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x = (e.clientX - r.left - r.width / 2) / r.width;
      y = (e.clientY - r.top - r.height / 2) / r.height;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMove); };
  }, []);

  return (
    <section className="act a1" id="overture">
      <div className="stage" ref={stageRef}>
        {mounted && <div className="aurora" aria-hidden />}
        <div className="dust" />
        <div className="stardust" aria-hidden>
          {stardust.map((s, i) => (
            <span key={i} suppressHydrationWarning className={`s-${s.variant}`}
              style={{
                left: `${s.l}%`, top: `${s.t}%`,
                animationDelay: `${s.d}s`, animationDuration: `${s.dur}s`,
                width: `${s.size}px`, height: `${s.size}px`,
                ["--op" as string]: s.op,
                ["--dx" as string]: `${s.dx}px`,
                ["--dy" as string]: `${s.dy}px`,
              } as React.CSSProperties} />
          ))}
        </div>
        <div className="violin" aria-hidden>
          <svg viewBox="-220 -240 440 480">
            {/* body silhouette */}
            <path className="body" d="M -50 -150 C -90 -150 -110 -110 -100 -70 C -130 -50 -140 0 -120 50 C -130 90 -110 130 -70 140 C -40 150 40 150 70 140 C 110 130 130 90 120 50 C 140 0 130 -50 100 -70 C 110 -110 90 -150 50 -150 C 30 -160 -30 -160 -50 -150 Z" />
            {/* fingerboard */}
            <path className="fingerboard" d="M -7 -150 L 7 -150 L 6 -8 L -6 -8 Z" />
            {/* f-holes */}
            <path className="fhole" d="M -28 -30 C -32 -10 -32 30 -26 50" />
            <path className="fhole" d="M  28 -30 C  32 -10  32 30  26 50" />
            <path className="fhole-mark" d="M -32 -16 L -22 -16 M -32 32 L -22 32" />
            <path className="fhole-mark" d="M  32 -16 L  22 -16 M  32 32 L  22 32" />
            {/* bridge */}
            <path className="bridge" d="M -18 14 L -14 4 L -8 6 L 0 2 L 8 6 L 14 4 L 18 14 Z" />
            {/* tailpiece */}
            <path className="tailpiece" d="M -8 38 L -14 110 C -14 124 14 124 14 110 L 8 38 Z" />
            {/* end button */}
            <circle className="dot" cx="0" cy="138" r="2.4" />
            {/* chinrest (left side) */}
            <path className="chinrest" d="M 6 38 C 36 36 56 60 52 96 C 48 122 26 134 8 134" />
            {/* strings — peg box to bridge */}
            <path className="strings" d="M -8 -150 L -8 14" />
            <path className="strings" d="M  -3 -150 L  -3 14" />
            <path className="strings" d="M   3 -150 L   3 14" />
            <path className="strings" d="M  8 -150 L  8 14" />
            {/* tail strings — bridge to tailpiece */}
            <path className="strings dim" d="M -8 14 L -6 38" />
            <path className="strings dim" d="M  -3 14 L -2 38" />
            <path className="strings dim" d="M   3 14 L  2 38" />
            <path className="strings dim" d="M  8 14 L  6 38" />
            {/* nut */}
            <path className="body" d="M -9 -152 L 9 -152 L 9 -148 L -9 -148 Z" />
            {/* peg box */}
            <path className="body" d="M -8 -150 C -16 -170 -10 -190 0 -190 C 10 -190 16 -170 8 -150 Z" />
            {/* pegs */}
            <circle className="peg" cx="-11" cy="-166" r="2" />
            <circle className="peg" cx="11" cy="-172" r="2" />
            <circle className="peg" cx="-11" cy="-180" r="2" />
            <circle className="peg" cx="11" cy="-186" r="2" />
            {/* bow group — stick + hair + tips */}
            <g className="bow-group">
              <path className="bow stick" d="M -180 -22 Q 0 12 180 38" />
              <path className="bow hair" d="M -180 -16 Q 0 16 180 44" />
              <circle className="bow-tip" cx="-180" cy="-22" r="3" />
              <circle className="bow-tip" cx="180" cy="38" r="2" />
            </g>
          </svg>
        </div>
        <div className="center">
          <div className="hero-stack">
            <div className="eyebrow">Practice tracking for audition season</div>
            <h1 className="wordmark">
              {letters.map((c, i) => (
                <span key={i} className="ch" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>{c}</span>
              ))}
            </h1>
            <div className="sub">
              <span className="breath-dot" />
              <span>Timers, repertoire, recordings, and deadlines in one place.</span>
            </div>
          </div>
        </div>
        <div className="scroll-cue">Scroll</div>
      </div>
    </section>
  );
}

// ─── ACT 2 — BOW DRAW ────────────────────────────────────────────────────
// Sticky 200vh act. As you scroll, the bow tip travels left→right tracing a
// sinuous waveform. Sentences appear word-by-word in lockstep with progress.
function Act2({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const p = useActProgress(ref, scrollY);

  const W = 1600, H = 900; // canvas units
  // Path control: a wide sinuous curve roughly horizontal in the lower-mid area
  const points = useMemo(() => {
    const n = 200, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(120, W - 120, t);
      const y = H * 0.62
        + Math.sin(t * Math.PI * 3.2) * 90
        + Math.sin(t * Math.PI * 6.5) * 22;
      pts.push([x, y]);
    }
    return pts;
  }, []);
  const drawn = Math.max(0.001, p);
  const idx = Math.min(points.length - 1, Math.floor(drawn * points.length));
  const trailD = "M " + points.slice(0, idx + 1).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const tip = points[idx] || points[0];
  // Bow stick: tangent at tip, projected back ~360 units behind
  const prev = points[Math.max(0, idx - 6)];
  const dx = tip[0] - prev[0], dy = tip[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const stick = {
    x1: tip[0] - ux * 360, y1: tip[1] - uy * 360,
    x2: tip[0] + ux * 30,  y2: tip[1] + uy * 30,
  };

  // Headline reveal — words come in across 0..0.85 progress
  const words = ["Turn", "each", "hour", "into", <em key="x">a record</em>, "you", "can", "use."];
  const wordCount = words.length;

  return (
    <section className="act tall-2" id="bow" ref={ref}>
      <div className="stage a2">
        <div className="canvas" aria-hidden>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
            <path className="trail" d={trailD} />
            <line className="bow-line"
                  x1={stick.x1} y1={stick.y1}
                  x2={stick.x2} y2={stick.y2} />
            <circle className="tip" cx={tip[0]} cy={tip[1]} r="5" />
          </svg>
        </div>
        <div className="stage-inner">
          <h2 className="head">
            {words.map((w, i) => {
              const t = i / wordCount;
              const visible = p > t * 0.9 + 0.04;
              return (
                <Fragment key={i}>
                  <span className={`word ${visible ? "in" : ""}`}>{w}</span>{" "}
                </Fragment>
              );
            })}
          </h2>
          <div className="meta">
            <span>Andante &mdash; Practice log</span>
            <span className="progress">{Math.round(p * 100).toString().padStart(2, "0")}</span>
            <span>{p > 0.95 ? "Complete" : "Drawing…"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── ACT 3 — HORIZONTAL PILLARS ──────────────────────────────────────────
// Sticky 300vh act; horizontal track translates as scroll progresses.
function Act3({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const p = useActProgress(ref, scrollY);

  const pillars = [
    {
      kicker: "i.", title: <>Practice <em>rooms.</em></>,
      body: "Join a focused room with timers on and microphones off. See who else is working without opening a chat.",
      vis: <PillarRooms />,
    },
    {
      kicker: "ii.", title: <>Audition <em>plans.</em></>,
      body: "Track dates, requirements, repertoire, and submissions for All-State, regionals, juries, and conservatory prescreens.",
      vis: <PillarPathway />,
    },
    {
      kicker: "iii.", title: <>The <em>loop</em> trainer.</>,
      body: "Mark the bars giving you trouble. Log tempo, repetitions, and notes after each pass.",
      vis: <PillarLoop />,
    },
    {
      kicker: "iv.", title: <>Recording <em>history.</em></>,
      body: "Keep takes by piece and date so you can hear what changed instead of guessing from memory.",
      vis: <PillarStack />,
    },
    {
      kicker: "v.", title: <>Cohort <em>context.</em></>,
      body: "Compare hours by piece or cohort when it helps. Hide the board when it gets in the way.",
      vis: <PillarLeader />,
    },
    {
      kicker: "vi.", title: <>Session <em>notes.</em></>,
      body: "End each session with one line: what improved, what slipped, and what comes next.",
      vis: <PillarWave />,
    },
  ];

  // Track translates from 0 → -(N * card + gaps - viewport)
  // Use viewport in CSS pixels via a measured ref
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [tx, setTx] = useState(0);
  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const tw = trackRef.current.scrollWidth;
    const vw = window.innerWidth;
    const distance = Math.max(0, tw - vw + 80);
    // Hold at start until p > 0.06; finish at p > 0.94 so endcards breathe.
    const eased = range(p, 0.06, 0.94, easeOut);
    setTx(-eased * distance);
  }, [p]);

  return (
    <section className="act tall-3" id="pillars" ref={ref}>
      <div className="stage a3">
        <div className="header">
          <div>
            <div className="kicker">III · Practice tools</div>
            <h2>Six tools.<br/>One practice log.</h2>
          </div>
          <div className="index">i&mdash;vi</div>
        </div>
        <div className="track" ref={trackRef} style={{ transform: `translate3d(${tx}px,0,0)` }}>
          {pillars.map((pl, i) => (
            <article key={i} className="pillar">
              <div className="num">{pl.kicker}</div>
              <h3>{pl.title}</h3>
              <div className="vis">{pl.vis}</div>
              <p>{pl.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// pillar visuals
function PillarWave() {
  const path = useMemo(() => {
    let d = "M 0 80";
    for (let i = 1; i <= 80; i++) {
      const x = (i / 80) * 460;
      const y = 80 + Math.sin(i * 0.42) * 36 + Math.sin(i * 0.18) * 18;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }, []);
  return <div className="viz-wave"><svg viewBox="0 0 460 160"><path d={path} /></svg></div>;
}
function PillarRooms() {
  const pins = [
    [50, 35], [62, 46], [70, 30], [42, 60], [78, 62], [55, 70], [30, 45],
  ];
  return (
    <div className="viz-globe">
      {pins.map((p, i) => (
        <div key={i} className="pin" style={{ left: `${p[0]}%`, top: `${p[1]}%`, animationDelay: `${i * 0.4}s` }} />
      ))}
    </div>
  );
}
function PillarLoop() {
  return <div className="viz-loop"><div className="center">04</div></div>;
}
function PillarStack() {
  const rows = [
    { t: "Bach · Chaconne · take 12", s: "Today" },
    { t: "Sibelius · Allegro · take 7", s: "Yesterday", active: true },
    { t: "Tchaikovsky · D maj · take 33", s: "3d" },
    { t: "Paganini · 24 · take 4", s: "1w" },
    { t: "Bach · Loure · take 19", s: "1w" },
  ];
  return (
    <div className="viz-stack">
      {rows.map((r, i) => (
        <div key={i} className={`row ${r.active ? "active" : ""}`}>
          <span>{r.t}</span><span className="small">{r.s}</span>
        </div>
      ))}
    </div>
  );
}
function PillarLeader() {
  const rows = [
    { r: "01", n: "K. Tanaka", v: 92 },
    { r: "02", n: "M. Park",   v: 88 },
    { r: "03", n: "you",       v: 84, you: true },
    { r: "04", n: "L. García",  v: 80 },
    { r: "05", n: "N. Singh",  v: 76 },
  ];
  return (
    <div className="viz-leader">
      {rows.map((r) => (
        <div key={r.r} className={`bar ${r.you ? "you" : ""}`}>
          <span className="rank">{r.r}</span>
          <span style={{ minWidth: 100 }}>{r.n}</span>
          <span className="meter"><span style={{ width: `${r.v}%` }} /></span>
          <span className="rank" style={{ width: 36, textAlign: "right" }}>{r.v}h</span>
        </div>
      ))}
    </div>
  );
}
function PillarPathway() {
  return (
    <div className="viz-pathway">
      <div className="ring"><div className="dot" /></div>
      <div className="ring r2"><div className="dot" /></div>
      <div className="ring r3"><div className="dot" /></div>
      <div className="num">49</div>
      <div className="label">Days · All-State</div>
    </div>
  );
}

// ─── ACT 4 — THE NAVE ────────────────────────────────────────────────────
function Act4({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const p = useActProgress(ref, scrollY);
  // 7-word headline staggered in
  const words = ["One", "hour", "at", <em key="x">a time.</em>, "One", "honest", "log."];
  const motes = useMemo(() =>
    Array.from({ length: 36 }).map((_, i) => ({
      l: (seededUnit(i + 1000) * 100).toFixed(2),
      d: (seededUnit(i + 1100) * 16).toFixed(2),
      dur: (10 + seededUnit(i + 1200) * 16).toFixed(2),
      size: (1.4 + seededUnit(i + 1300) * 2.6).toFixed(2),
      drift: Math.round(seededUnit(i + 1400) * 60 - 30),
      op: (0.3 + seededUnit(i + 1500) * 0.55).toFixed(2),
    })), []);
  return (
    <section className="act tall-2" id="nave" ref={ref}>
      <div className="stage a4">
        <div className="shafts" aria-hidden>
          <span className="shaft s1" /><span className="shaft s2" />
          <span className="shaft s3" /><span className="shaft s4" />
          <span className="shaft s5" />
        </div>
        <div className="dust-motes" aria-hidden>
          {motes.map((m, i) => (
            <span key={i} suppressHydrationWarning style={{
              left: `${m.l}%`, animationDelay: `${m.d}s`, animationDuration: `${m.dur}s`,
              width: `${m.size}px`, height: `${m.size}px`,
              ["--drift" as string]: `${m.drift}px`,
              ["--op" as string]: m.op,
            } as React.CSSProperties} />
          ))}
        </div>
        <div className="floor" aria-hidden />
        <div className="center">
          <h2 className="text">
            {words.map((w, i) => {
              const t = i / words.length;
              const visible = p > t * 0.7 + 0.05;
              return (
                <Fragment key={i}>
                  <span className={`word ${visible ? "in" : ""}`}>{w}</span>{" "}
                </Fragment>
              );
            })}
          </h2>
        </div>
        <div className="epigraph">what changed, what still needs work</div>
      </div>
    </section>
  );
}

// ─── ACT 5 — LIVE PULSE ──────────────────────────────────────────────────
function Act5() {
  const [count, setCount] = useState(2847);
  const [feed, setFeed] = useState([
    { who: "Aiko",  what: "Brahms · D minor",     where: "Tokyo · 3 min" },
    { who: "Marco", what: "Beethoven · Op. 67",   where: "São Paulo · 6 min" },
    { who: "Lena",  what: "Bach · Partita No. 2", where: "Berlin · 11 min" },
    { who: "Rohan", what: "Saint-Saëns · A minor",where: "Mumbai · 14 min" },
    { who: "Sofia", what: "Sibelius · D minor",   where: "Helsinki · 22 min" },
  ]);
  useEffect(() => {
    const t = setInterval(() => setCount(c => c + Math.floor(Math.random() * 3) + 1), 1400);
    return () => clearInterval(t);
  }, []);
  // Ring pins around globe — placed on concentric circles
  const pins = useMemo(() => {
    const r: { x: string; y: string; d: string; size: number }[] = [];
    for (let ring = 0; ring < 3; ring++) {
      const radius = 120 + ring * 36;
      const n = 6 + ring * 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.4;
        r.push({
          x: (Math.cos(a) * radius).toFixed(4),
          y: (Math.sin(a) * radius).toFixed(4),
          d: (i * 0.18 + ring * 0.3).toFixed(4),
          size: 4 + (i % 3),
        });
      }
    }
    return r;
  }, []);
  // arcs connecting select pins across the globe
  const arcs = useMemo(() => {
    if (pins.length === 0) return [];
    const out: { d: string; dur: number; delay: number }[] = [];
    const pairs = [[0, 11], [3, 14], [6, 18], [9, 21], [1, 16], [4, 24]];
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      const p1 = pins[a]; const p2 = pins[b % pins.length];
      if (!p1 || !p2) continue;
      const x1 = parseFloat(p1.x), y1 = parseFloat(p1.y);
      const x2 = parseFloat(p2.x), y2 = parseFloat(p2.y);
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      const len = Math.hypot(cx, cy) || 1;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const cpx = cx + (cx / len) * dist * 0.35;
      const cpy = cy + (cy / len) * dist * 0.35;
      out.push({
        d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        dur: 5 + (i % 3) * 1.6,
        delay: i * 0.9,
      });
    }
    return out;
  }, [pins]);
  return (
    <section className="act" id="pulse">
      <div className="stage a5">
        <div className="stage-inner">
          <div className="left">
            <div className="kicker">V · Practice rooms</div>
            <h2>Work near<br/><em>other players</em><br/>without the noise.</h2>
            <p>Rooms show who's in, how long they've been there, and what they're working on. Timer stays on screen. No chat.</p>
          </div>
          <div className="right">
            <div className="globe-bg" />
            <div className="scan" aria-hidden />
            <div className="arc" style={{ left: "50%", top: "50%", width: 320, height: 320, transform: "translate(-50%,-50%)" }} />
            <div className="arc" style={{ left: "50%", top: "50%", width: 460, height: 460, transform: "translate(-50%,-50%)" }} />
            <div className="arc" style={{ left: "50%", top: "50%", width: 600, height: 600, transform: "translate(-50%,-50%)" }} />
            <svg className="connections" viewBox="-300 -300 600 600" aria-hidden>
              {arcs.map((a, i) => (
                <path key={i} d={a.d} suppressHydrationWarning
                  style={{ animationDuration: `${a.dur}s`, animationDelay: `${a.delay}s` }} />
              ))}
            </svg>
            {pins.map((pn, i) => (
              <span key={i} className="pin" suppressHydrationWarning
                    style={{ left: `calc(50% + ${pn.x}px)`, top: `calc(50% + ${pn.y}px)`,
                             width: `${pn.size}px`, height: `${pn.size}px`,
                             animationDelay: `${pn.d}s` }} />
            ))}
            <div className="tally">
              <div className="num"><Counter value={count} /><span className="live">Live</span></div>
              <div className="label">players in focused rooms</div>
            </div>
            <div className="feed">
              {feed.slice(0, 3).map((f, i) => (
                <div key={i} className="feed-row">
                  <div><strong>{f.who}</strong> &middot; {f.what}</div>
                  <div className="what">{f.where}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Counter({ value }: { value: number }) {
  // Render digits as a flipping marquee for tabular drama.
  const s = String(value);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{s}</span>;
}

// ─── ACT 6 — TESTIMONIAL HORIZONTAL ──────────────────────────────────────
// Sticky 200vh — translates a long ribbon of huge italic quotes horizontally.
function Act6({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const p = useActProgress(ref, scrollY);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [tx, setTx] = useState(0);
  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const tw = trackRef.current.scrollWidth;
    const vw = window.innerWidth;
    const distance = Math.max(0, tw - vw);
    const eased = range(p, 0.05, 0.95, easeOut);
    setTx(-eased * distance);
  }, [p]);

  const quotes = [
    { q: "My teacher can see the work between lessons.", a: "Sera, 17 · viola, Toronto" },
    { q: "The timer finally feels useful.", a: "Mauricio, 14 · violin, Madrid" },
    { q: "We talk about the log, not whether practice happened.", a: "Nina, 12 + her mom" },
    { q: "I knew what to fix before the next round.", a: "Jacob, 16 · cello, Atlanta" },
  ];

  return (
    <section className="act tall-2" id="voices" ref={ref}>
      <div className="stage a6">
        <div className="header">
          <span>VI · Voices</span>
          <span>{Math.round(p * 100)}</span>
        </div>
        <div className="track" ref={trackRef} style={{ transform: `translate3d(${tx}px,0,0)` }}>
          {quotes.map((q, i) => (
            <div key={i} className="quote">
              <span className="mark">&ldquo;</span>
              <span>{q.q}</span>
              <span className="credit">{q.a}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ACT 7 — CLOSING ─────────────────────────────────────────────────────
function Act7() {
  return (
    <section className="act" id="begin">
      <div className="stage a7">
        <div className="center">
          <div className="stack">
            <h2><em>Begin.</em></h2>
            <p className="lede">Add a piece, set the next deadline, and log the first session today.</p>
            <div className="ctas">
              <Link href="/signup" className="cta-primary">Track your first session</Link>
              <Link href="/pricing" className="cta-ghost">View pricing</Link>
            </div>
          </div>
        </div>
        <div className="signoff">
          <span>Andante · 2026</span>
          <em>poco a poco</em>
          <span>Practice logs · recordings · deadlines</span>
        </div>
      </div>
    </section>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────
export function MarketingHomepage() {
  const scrollY = useScrollProgress();
  const [docH, setDocH] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setDocH(document.documentElement.scrollHeight - window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const total = docH > 0 ? clamp01(scrollY / docH) : 0;

  // active act for the rail: derive from scroll bands
  const acts = ["overture", "bow", "pillars", "nave", "pulse", "voices", "begin"];
  const [active, setActive] = useState(0);
  useEffect(() => {
    let best = 0, bestY = Infinity;
    acts.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const y = Math.abs(el.getBoundingClientRect().top - 100);
      if (y < bestY) { bestY = y; best = i; }
    });
    setActive(best);
  }, [scrollY]);

  return (
    <div className="andante-homepage">
      <Nav />
      <ScrollOrb progress={total} />
      <ActsRail active={active} />
      <main className="scroller">
        <Act1 />
        <Act2 scrollY={scrollY} />
        <Act3 scrollY={scrollY} />
        <Act4 scrollY={scrollY} />
        <Act5 />
        <Act6 scrollY={scrollY} />
        <Act7 />
      </main>
    </div>
  );
}
