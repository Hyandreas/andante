/* Andante — The Living Score (WebGL engine)
   One continuous musical score the camera travels through; per-act
   choreography (glide · bank/roll · orbit · pitch-up · pull-back · lateral
   run · ascend). Ported from the design-reference `score.js` into the
   Andante codebase. This module is dynamically imported so `three` is kept
   out of the initial route bundle. */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// P=scroll 0..1 · t=anchor along spine · az=orbit angle (deg, may exceed 360
// for multi-turn) · pol=elevation above the orbit plane · dist=camera distance
// · look=how far ahead (in t) the target sits (small => looks AT the subject)
// · roll=camera bank (deg) · fov · tilt=orbit-axis bank (deg): tilts the axis
// the camera circles, so different acts orbit about different axes.
type Keyframe = { P: number; t: number; az: number; pol: number; dist: number; look: number; roll: number; fov: number; tilt: number };

/** Boot the living-score scene inside `root`. Returns a cleanup function. */
export function startLivingScore(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>(".hp-gl");
  if (!canvas || !root.isConnected) return () => {};

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);

  const letters = root.querySelectorAll<HTMLElement>(".wordmark .ch");

  const prefersReduced =
    root.getAttribute("data-motion") === "off" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── renderer / scene ──────────────────────────────────────────────
  // If the GL context can't be created (unsupported / blocked / lost), throw so
  // the dynamic-import `.catch()` in marketing-homepage falls back to the static,
  // server-rendered copy instead of leaving the page an empty black void.
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (err) {
    root.classList.add("hp-static");
    throw err;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);

  // If the GPU context is lost at runtime, stop the loop and reveal the static
  // copy so the page degrades gracefully rather than freezing on a dead canvas.
  let contextLost = false;
  const onContextLost = (e: Event) => {
    e.preventDefault(); // allow restoration, but don't keep rendering a dead frame
    contextLost = true;
    cancelAnimationFrame(rafId);
    root.classList.add("hp-static");
  };
  canvas.addEventListener("webglcontextlost", onContextLost as EventListener, false);

  const scene = new THREE.Scene();
  // Pure void: no fog at all. The score is luminous geometry hanging in black
  // space — only the starfield and bloom fill the dark. The far clip is pulled
  // in so the far end of the ribbon simply isn't drawn (no foggy haze, no hard
  // pop): it converges to a tiny bloom point and the rest is black.
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 340);

  const COL_RAIL = new THREE.Color(0x9fc2ff);
  const COL_RAIL_HOT = new THREE.Color(0xe2ecff);
  const COL_BAR = new THREE.Color(0x4f74c8);
  const WHITE = new THREE.Color(0xffffff);

  // track every disposable so cleanup is complete
  const disposables: Array<{ dispose: () => void }> = [];

  // ── the score spine (long, varied, banking journey) ───────────────
  const ctrl: THREE.Vector3[] = [];
  const SEGMENTS = 122;
  for (let i = 0; i <= SEGMENTS; i++) {
    const z = -i * 6.6;
    const x = Math.sin(i * 0.165) * 7.4 + Math.sin(i * 0.067) * 4.0 + Math.sin(i * 0.31) * 1.4;
    const y = Math.sin(i * 0.125) * 3.1 + Math.cos(i * 0.052) * 1.8 + Math.sin(i * 0.27) * 0.8;
    ctrl.push(new THREE.Vector3(x, y, z));
  }
  const spine = new THREE.CatmullRomCurve3(ctrl, false, "catmullrom", 0.5);
  const DIV = 2400;
  const pts = spine.getSpacedPoints(DIV);
  const frames = spine.computeFrenetFrames(DIV, false);
  const binAt = (idx: number) => frames.binormals[Math.max(0, Math.min(frames.binormals.length - 1, idx))];

  const score = new THREE.Group();
  scene.add(score);

  // 5 staff rails offset across the ribbon's binormal
  const STAFF = [-1, -0.5, 0, 0.5, 1];
  const RAIL_GAP = 0.62;
  STAFF.forEach((off, ri) => {
    const railPts: THREE.Vector3[] = [];
    for (let j = 0; j <= DIV; j += 2) railPts.push(pts[j].clone().addScaledVector(binAt(j), off * RAIL_GAP));
    const rc = new THREE.CatmullRomCurve3(railPts);
    const center = ri === 2;
    const tube = new THREE.TubeGeometry(rc, 1400, center ? 0.05 : 0.038, 7, false);
    const mat = new THREE.MeshBasicMaterial({ color: center ? COL_RAIL_HOT : COL_RAIL, transparent: true, opacity: center ? 0.96 : 0.8, fog: true });
    disposables.push(tube, mat);
    score.add(new THREE.Mesh(tube, mat));
  });

  // measure bar-lines crossing the staff
  const barMat = new THREE.MeshBasicMaterial({ color: COL_BAR, transparent: true, opacity: 0.5, fog: true });
  disposables.push(barMat);
  for (let bi = 40; bi < DIV - 40; bi += 64) {
    const bn = binAt(bi);
    const bc = new THREE.CatmullRomCurve3([
      pts[bi].clone().addScaledVector(bn, -1.18 * RAIL_GAP),
      pts[bi].clone(),
      pts[bi].clone().addScaledVector(bn, 1.18 * RAIL_GAP),
    ]);
    const g = new THREE.TubeGeometry(bc, 4, 0.018, 5, false);
    disposables.push(g);
    score.add(new THREE.Mesh(g, barMat));
  }

  // note-heads riding the staff
  const noteGeo = new THREE.SphereGeometry(0.13, 16, 16);
  disposables.push(noteGeo);
  type Note = THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> & {
    userData: { base: number; phase: number; freq: number; baseColor: THREE.Color; noteT: number };
  };
  const notes: Note[] = [];
  const pitches = [-1, -0.5, 0, 0.5, 1, 1.5, -1.5];
  let ni = 40;
  while (ni < DIV - 40) {
    const pitch = pitches[Math.floor(Math.abs(Math.sin(ni * 0.7)) * pitches.length) % pitches.length];
    const pos = pts[ni].clone().addScaledVector(binAt(ni), pitch * RAIL_GAP);
    const hot = Math.random() > 0.82;
    const baseCol = hot ? new THREE.Color(0xc6d8ff) : new THREE.Color(0x9fc2ff);
    const m = new THREE.MeshBasicMaterial({ color: baseCol.clone(), transparent: true, opacity: 0.82, fog: true });
    disposables.push(m);
    const mesh = new THREE.Mesh(noteGeo, m) as Note;
    mesh.position.copy(pos);
    const base = 0.8 + Math.random() * 0.6;
    mesh.scale.setScalar(base);
    mesh.userData = { base, phase: Math.random() * Math.PI * 2, freq: 1.0 + Math.random() * 1.7, baseColor: baseCol, noteT: ni / DIV };
    score.add(mesh);
    notes.push(mesh);
    ni += 12 + Math.floor(Math.random() * 15);
  }

  // ── starfield ─────────────────────────────────────────────────────
  function makeCircleTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.5, "rgba(255,255,255,0.7)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }
  function makeGlowTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,0.9)"); grd.addColorStop(0.25, "rgba(160,195,255,0.5)"); grd.addColorStop(1, "rgba(160,195,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const starCount = window.innerWidth < 760 ? 900 : 2000;
  const starPos = new Float32Array(starCount * 3);
  for (let s = 0; s < starCount; s++) {
    starPos[s * 3] = (Math.random() - 0.5) * 260;
    starPos[s * 3 + 1] = (Math.random() - 0.5) * 180;
    starPos[s * 3 + 2] = 30 - Math.random() * 900;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starTex = makeCircleTexture();
  const starMat = new THREE.PointsMaterial({
    color: 0xb9ccf0, size: 0.5, sizeAttenuation: true, map: starTex,
    transparent: true, opacity: 0.6, depthWrite: false, alphaTest: 0.02, blending: THREE.AdditiveBlending, fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  disposables.push(starGeo, starMat, starTex);
  scene.add(stars);

  // horizon glows seeded along the score
  const glowTex = makeGlowTexture();
  disposables.push(glowTex);
  // Smaller, dimmer, and nudged off the spine so the camera flies *past* them
  // (distant cathedral-light blooms) instead of *through* a screen-filling haze.
  [0.34, 0.66, 0.92].forEach((tt) => {
    const sm = new THREE.SpriteMaterial({ map: glowTex, color: 0x84a9ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    disposables.push(sm);
    const sp = new THREE.Sprite(sm);
    sp.scale.set(52, 52, 1);
    sp.position.copy(spine.getPointAt(tt)).addScaledVector(binAt(Math.round(tt * DIV)), 7);
    scene.add(sp);
  });

  // the playhead — the bright point where the score is "sounding" right now
  const playheadMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xd6e4ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  disposables.push(playheadMat);
  const playhead = new THREE.Sprite(playheadMat);
  playhead.scale.set(2.6, 2.6, 1);
  scene.add(playhead);

  // ── post: bloom ───────────────────────────────────────────────────
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // strength up, threshold up: bright rails/notes bloom into a luminous glow
    // while the dark void stays clean (no milky veil over everything).
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.3, 0.8, 0.2);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composer.setSize(window.innerWidth, window.innerHeight);
  } catch {
    composer = null;
    bloomPass = null;
  }

  // ── audio: a real recording plays under the score ─────────────────
  // Drop a track at /public/audio/homepage.mp3 (one you have the rights to —
  // e.g. a public-domain / CC0 recording such as Musopen's). Off until the
  // visitor enables it (browser autoplay needs a user gesture); it loops with a
  // gentle fade in/out. The note flares stay purely visual (no synthesis).
  const AUDIO_SRC = "/audio/homepage.mp3";
  const MUSIC_VOL = 0.7;
  let music: HTMLAudioElement | null = null;
  let musicOn = false;
  let fadeTimer = 0;
  const soundBtn = $("#hp-sound");

  // setInterval (not rAF) so the fade still completes in a backgrounded tab —
  // rAF is paused while hidden, which would otherwise leave the volume stuck.
  function fadeTo(target: number, dur: number, done?: () => void) {
    if (!music) return;
    clearInterval(fadeTimer);
    const from = music.volume;
    const t0 = performance.now();
    fadeTimer = window.setInterval(() => {
      if (!music) { clearInterval(fadeTimer); return; }
      const k = dur <= 0 ? 1 : clamp01((performance.now() - t0) / dur);
      music.volume = clamp01(from + (target - from) * k);
      if (k >= 1) { clearInterval(fadeTimer); fadeTimer = 0; if (done) done(); }
    }, 30);
  }

  function setAudio(on: boolean) {
    if (on && !music) {
      music = new Audio(AUDIO_SRC);
      music.loop = true; music.preload = "auto"; music.volume = 0;
      // no track present (or undecodable): reflect an unavailable state
      music.addEventListener("error", () => {
        musicOn = false;
        soundBtn?.classList.remove("on");
        soundBtn?.setAttribute("aria-pressed", "false");
        soundBtn?.setAttribute("data-unavailable", "true");
      });
    }
    musicOn = on;
    if (on && music) {
      music.play().then(() => fadeTo(MUSIC_VOL, 900)).catch(() => {});
    } else if (music) {
      fadeTo(0, 500, () => { if (music && !musicOn) music.pause(); });
    }
  }

  const onSoundToggle = () => {
    const next = !musicOn;
    setAudio(next);
    soundBtn?.classList.toggle("on", next);
    soundBtn?.setAttribute("aria-pressed", String(next));
  };
  soundBtn?.addEventListener("click", onSoundToggle);

  // ── camera choreography keyframes ─────────────────────────────────
  // A continuous drone flight. az is kept continuous between neighbours (no
  // accidental whip-arounds); the only big sweep is the deliberate orbit.
  const KEYS: Keyframe[] = [
    // I · Overture — high establishing glide in from behind, settling forward
    { P: 0.00, t: 0.010, az: 0, pol: 24, dist: 6.6, look: 0.050, roll: 0, fov: 60, tilt: 0 },
    { P: 0.09, t: 0.050, az: -8, pol: 20, dist: 6.4, look: 0.050, roll: 2, fov: 60, tilt: 0 },
    // II · The Bow — bank down close and arc across the ribbon (roll flips)
    { P: 0.16, t: 0.092, az: 38, pol: 16, dist: 4.8, look: 0.038, roll: 12, fov: 58, tilt: 10 },
    { P: 0.24, t: 0.140, az: -28, pol: 22, dist: 5.6, look: 0.034, roll: -10, fov: 60, tilt: 8 },
    // III · Six Tools — one full banked orbit of the subject (look AT it)
    { P: 0.30, t: 0.170, az: -110, pol: 26, dist: 6.6, look: 0.010, roll: 0, fov: 60, tilt: 18 },
    { P: 0.37, t: 0.190, az: -240, pol: 40, dist: 7.6, look: 0.010, roll: 0, fov: 62, tilt: 30 },
    { P: 0.44, t: 0.215, az: -360, pol: 30, dist: 6.8, look: 0.010, roll: 0, fov: 61, tilt: 26 },
    { P: 0.50, t: 0.250, az: -388, pol: 22, dist: 5.8, look: 0.022, roll: 0, fov: 60, tilt: 12 },
    // IV · The Nave — rise to a steep overhead, then swoop low behind
    { P: 0.56, t: 0.310, az: -388, pol: 64, dist: 8.6, look: 0.045, roll: 0, fov: 65, tilt: 0 },
    { P: 0.62, t: 0.370, az: -384, pol: 22, dist: 5.0, look: 0.050, roll: -4, fov: 60, tilt: 0 },
    // V · Live — huge banked pull-back (wide & high), then rush back in
    { P: 0.70, t: 0.440, az: -300, pol: 42, dist: 15.5, look: 0.018, roll: 0, fov: 66, tilt: 14 },
    { P: 0.77, t: 0.470, az: -360, pol: 22, dist: 5.0, look: 0.045, roll: 0, fov: 59, tilt: 0 },
    // VI · Voices — low lateral tracking run alongside, banking side to side
    { P: 0.84, t: 0.540, az: -430, pol: 16, dist: 5.6, look: 0.020, roll: 8, fov: 58, tilt: 0 },
    { P: 0.92, t: 0.620, az: -455, pol: 18, dist: 5.8, look: 0.020, roll: -7, fov: 59, tilt: 0 },
    // VII · Begin — swing behind, rise and look far ahead toward the light
    { P: 1.00, t: 0.740, az: -360, pol: 36, dist: 9.0, look: 0.090, roll: 0, fov: 60, tilt: 0 },
  ];
  function sampleKeys(P: number): Omit<Keyframe, "P"> {
    if (P <= KEYS[0].P) return KEYS[0];
    if (P >= KEYS[KEYS.length - 1].P) return KEYS[KEYS.length - 1];
    let a = KEYS[0], b = KEYS[1];
    for (let k = 0; k < KEYS.length - 1; k++) { if (P >= KEYS[k].P && P <= KEYS[k + 1].P) { a = KEYS[k]; b = KEYS[k + 1]; break; } }
    const u = smooth((P - a.P) / (b.P - a.P));
    return {
      t: lerp(a.t, b.t, u), az: lerp(a.az, b.az, u), pol: lerp(a.pol, b.pol, u),
      dist: lerp(a.dist, b.dist, u), look: lerp(a.look, b.look, u), roll: lerp(a.roll, b.roll, u),
      fov: lerp(a.fov, b.fov, u), tilt: lerp(a.tilt, b.tilt, u),
    };
  }

  const worldUp = new THREE.Vector3(0, 1, 0);
  let playheadT = 0;
  const _anchor = new THREE.Vector3(), _tan = new THREE.Vector3(), _dir = new THREE.Vector3(),
    _right = new THREE.Vector3(), _look = new THREE.Vector3(), _up = new THREE.Vector3(), _camDir = new THREE.Vector3(),
    _axis = new THREE.Vector3(), _orbRight = new THREE.Vector3();

  function placeCamera(P: number, mxv: number, myv: number, time: number) {
    const kf = sampleKeys(P);
    const t = clamp01(kf.t);
    playheadT = t;
    _anchor.copy(spine.getPointAt(t));
    _tan.copy(spine.getTangentAt(t)).normalize();

    const bob = prefersReduced ? 0 : Math.sin(time * 0.5) * 0.1;
    const azV = kf.az + mxv * 10;
    const polV = Math.max(9, kf.pol + myv * 6);

    // The orbit axis is world-up tilted around the horizontal axis of travel,
    // so each act can circle the score about a different (banked) axis rather
    // than always yawing flat around vertical.
    _right.crossVectors(_tan, worldUp).normalize();
    _axis.copy(worldUp).applyAxisAngle(_right, kf.tilt * DEG).normalize();

    _dir.copy(_tan).multiplyScalar(-1);            // start behind the anchor
    _dir.applyAxisAngle(_axis, azV * DEG);         // orbit around the (banked) axis
    _orbRight.crossVectors(_dir, _axis).normalize();
    _dir.applyAxisAngle(_orbRight, polV * DEG);    // lift above the orbit plane

    camera.position.copy(_anchor).addScaledVector(_dir, kf.dist + bob);

    _look.copy(spine.getPointAt(clamp01(t + kf.look)));
    _look.x += mxv * 1.0; _look.y += 0.15;

    _camDir.copy(_look).sub(camera.position).normalize();
    _up.copy(worldUp).applyAxisAngle(_camDir, kf.roll * DEG);
    camera.up.copy(_up);
    camera.lookAt(_look);

    if (Math.abs(camera.fov - kf.fov) > 0.01) { camera.fov = kf.fov; camera.updateProjectionMatrix(); }
  }

  // ── overlay drivers ───────────────────────────────────────────────
  const BANDS: Record<string, [number, number]> = {
    overture: [0.00, 0.11], bow: [0.12, 0.25], pillars: [0.27, 0.49],
    nave: [0.50, 0.60], live: [0.62, 0.73], voices: [0.75, 0.86], begin: [0.88, 1.01],
  };
  const ovEls: Record<string, HTMLElement> = {};
  root.querySelectorAll<HTMLElement>(".ov").forEach((el) => {
    const act = el.getAttribute("data-act");
    if (act) ovEls[act] = el;
  });

  function bandVis(P: number, band: [number, number], fadeFrac?: number) {
    const a = band[0], b = band[1];
    if (P < a || P > b) return 0;
    const f = (b - a) * (fadeFrac || 0.26);
    const fin = a <= 0.0001 ? 1 : smooth((P - a) / f);
    const fout = b >= 1.0 ? 1 : smooth((b - P) / f);
    return Math.min(1, Math.min(fin, fout));
  }

  function setOv(el: HTMLElement | undefined, vis: number, riseDir?: number) {
    if (!el) return;
    el.style.opacity = String(vis);
    const off = (1 - vis) * 26 * (riseDir || 1);
    el.style.transform = "translateY(" + off + "px)";
  }

  // pillars content
  const TOOLS = [
    { n: "i", t: "Practice <em>rooms.</em>", d: "Join a focused room with timers on and microphones off. See who else is working without opening a chat." },
    { n: "ii", t: "Audition <em>plans.</em>", d: "Track dates, requirements, repertoire, and submissions for All-State, regionals, juries, and prescreens." },
    { n: "iii", t: "The <em>loop</em> trainer.", d: "Mark the bars giving you trouble. Log tempo, repetitions, and notes after each pass." },
    { n: "iv", t: "Recording <em>history.</em>", d: "Keep takes by piece and date so you can hear what changed instead of guessing from memory." },
    { n: "v", t: "Cohort <em>context.</em>", d: "Compare hours by piece or cohort when it helps. Hide the board when it gets in the way." },
    { n: "vi", t: "Session <em>notes.</em>", d: "End each session with one line: what improved, what slipped, and what comes next." },
  ];
  const toolIndex = $("#hp-toolIndex"), toolTitle = $("#hp-toolTitle"), toolDesc = $("#hp-toolDesc");
  const toolDots = $("#hp-toolDots")?.children;
  let lastTool = -1;
  function updatePillars(P: number) {
    const b = BANDS.pillars; const lp = clamp01((P - b[0]) / (b[1] - b[0]));
    const idx = Math.min(TOOLS.length - 1, Math.floor(lp * TOOLS.length));
    if (idx !== lastTool) {
      lastTool = idx; const T = TOOLS[idx];
      if (toolIndex) toolIndex.textContent = T.n + " — vi";
      if (toolTitle) toolTitle.innerHTML = T.t;
      if (toolDesc) toolDesc.innerHTML = T.d;
      if (toolDots) for (let d = 0; d < toolDots.length; d++) toolDots[d].className = d === idx ? "on" : "";
    }
  }

  // voices content
  const QUOTES = [
    { q: "My teacher can see the work between lessons.", a: "Sera, 17 · viola, Toronto" },
    { q: "The timer finally feels useful.", a: "Mauricio, 14 · violin, Madrid" },
    { q: "We talk about the log, not whether practice happened.", a: "Nina, 12 — and her mom" },
    { q: "I knew what to fix before the next round.", a: "Jacob, 16 · cello, Atlanta" },
  ];
  const quoteText = $("#hp-quoteText"), quoteCredit = $("#hp-quoteCredit");
  let lastQuote = -1;
  function updateVoices(P: number) {
    const b = BANDS.voices; const lp = clamp01((P - b[0]) / (b[1] - b[0]));
    const idx = Math.min(QUOTES.length - 1, Math.floor(lp * QUOTES.length));
    if (idx !== lastQuote) {
      lastQuote = idx;
      if (quoteText) quoteText.textContent = QUOTES[idx].q;
      if (quoteCredit) quoteCredit.textContent = QUOTES[idx].a;
    }
  }

  // live counter
  const liveCount = $("#hp-liveCount");
  let liveVal = 2847, liveAccum = 0;

  // ── scroll + mouse ────────────────────────────────────────────────
  let rawScroll = 0, P = 0, smoothPv = 0;
  const readScroll = () => { rawScroll = window.scrollY || document.documentElement.scrollTop || 0; };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const onMove = (e: MouseEvent) => { tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5; };
  window.addEventListener("mousemove", onMove, { passive: true });

  const scrollCue = $(".scroll-cue");
  const orbFg = root.querySelector<SVGCircleElement>("#hp-orbFg");
  const ORB_C = 2 * Math.PI * 12;
  if (orbFg) orbFg.setAttribute("stroke-dasharray", String(ORB_C));

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    if (bloomPass) bloomPass.setSize(w, h);
  }
  window.addEventListener("resize", resize);

  // ── intro reveal (rAF-driven) ─────────────────────────────────────
  let introDone = false;
  const clock = new THREE.Clock();
  let rafId = 0;

  function frame() {
    if (contextLost) return; // GPU context gone — static copy is now visible
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    rawScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const docTotal = document.documentElement.scrollHeight - window.innerHeight;
    P = docTotal > 0 ? clamp01(rawScroll / docTotal) : 0;
    smoothPv += (P - smoothPv) * (prefersReduced ? 1 : Math.min(1, dt * 5.5));
    mx += (tmx - mx) * Math.min(1, dt * 4); my += (tmy - my) * Math.min(1, dt * 4);

    placeCamera(smoothPv, mx, my, time);

    if (!prefersReduced) { stars.rotation.y += dt * 0.005; stars.rotation.x = my * 0.03; }
    // the score plays: a scroll-driven playhead sweeps the staff, striking notes in turn
    for (let n = 0; n < notes.length; n++) {
      const u = notes[n].userData;
      const dd = Math.abs(playheadT - u.noteT);
      let strike = dd < 0.011 ? (1 - dd / 0.011) : 0; strike *= strike;
      const pulse = prefersReduced ? 0 : 0.16 * Math.sin(time * u.freq + u.phase);
      notes[n].scale.setScalar(u.base * (1 + pulse + strike * 1.5));
      notes[n].material.color.copy(u.baseColor).lerp(WHITE, strike);
      notes[n].material.opacity = Math.min(1, 0.82 + 0.18 * strike + pulse * 0.3);
    }
    playhead.position.copy(spine.getPointAt(clamp01(playheadT)));
    playhead.material.opacity = 0.3 + (prefersReduced ? 0.15 : 0.2 * (0.5 + 0.5 * Math.sin(time * 3.0)));

    // overlays
    setOv(ovEls.overture, bandVis(smoothPv, BANDS.overture), 1);
    setOv(ovEls.bow, bandVis(smoothPv, BANDS.bow), 1);
    setOv(ovEls.pillars, bandVis(smoothPv, BANDS.pillars), 1);
    setOv(ovEls.nave, bandVis(smoothPv, BANDS.nave), 1);
    setOv(ovEls.live, bandVis(smoothPv, BANDS.live), 1);
    setOv(ovEls.voices, bandVis(smoothPv, BANDS.voices), 1);
    setOv(ovEls.begin, bandVis(smoothPv, BANDS.begin), 1);
    updatePillars(smoothPv); updateVoices(smoothPv);

    // live counter ticks while in/near the live act
    if (smoothPv > 0.58 && smoothPv < 0.76 && !prefersReduced) {
      liveAccum += dt;
      if (liveAccum > 1.3) { liveAccum = 0; liveVal += Math.floor(Math.random() * 3) + 1; if (liveCount) liveCount.textContent = liveVal.toLocaleString(); }
    }

    // intro reveal of the overture wordmark
    if (!introDone) {
      const tw = (d: number, dur: number) => easeOut(clamp01((time - d) / dur));
      const elE = ovEls.overture?.querySelector<HTMLElement>(".eyebrow");
      const elS = ovEls.overture?.querySelector<HTMLElement>(".sub");
      const pe = tw(0.2, 1.2);
      if (elE) { elE.style.opacity = String(pe); elE.style.transform = "translateY(" + (1 - pe) * 12 + "px)"; }
      for (let li = 0; li < letters.length; li++) {
        const pl = tw(0.3 + li * 0.08, 1.0);
        letters[li].style.opacity = String(pl);
        letters[li].style.transform = "translateY(" + (1 - pl) * 40 + "px)";
        letters[li].style.filter = "blur(" + (1 - pl) * 14 + "px)";
      }
      const ps = tw(1.5, 1.2);
      if (elS) { elS.style.opacity = String(ps); elS.style.transform = "translateY(" + (1 - ps) * 12 + "px)"; }
      if (time > 4.0) {
        introDone = true;
        if (elE) elE.style.transform = "none";
        if (elS) elS.style.transform = "none";
        for (let lj = 0; lj < letters.length; lj++) { letters[lj].style.opacity = "1"; letters[lj].style.transform = "none"; letters[lj].style.filter = "none"; }
      }
    }

    if (scrollCue) scrollCue.style.opacity = String(clamp01(1 - smoothPv * 12));
    if (orbFg) orbFg.setAttribute("stroke-dashoffset", String(ORB_C * (1 - P)));

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  frame();

  // ── cleanup ───────────────────────────────────────────────────────
  return function cleanup() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", readScroll);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", onContextLost as EventListener);
    soundBtn?.removeEventListener("click", onSoundToggle);
    clearInterval(fadeTimer);
    if (music) { try { music.pause(); music.src = ""; } catch { /* noop */ } music = null; }
    disposables.forEach((d) => { try { d.dispose(); } catch { /* noop */ } });
    if (composer) composer.dispose();
    renderer.dispose();
  };
}
