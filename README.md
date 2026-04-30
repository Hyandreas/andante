# Handoff: Andante — Practice OS

## Overview

Andante is a practice-tracking and competition-prep SaaS for serious classical musicians (students aged 13–28, teachers, conservatory faculty). The product surfaces on **web (desktop-first)** and **mobile (iOS-first)** and is divided into two primary roles: **Musician** and **Teacher/Studio**.

Core value props:
- Audition-specific Pathways (NYSSMA, CMIM, Regionals, Asia Pro-Track)
- Quiet Practice Rooms (co-working timers, no chat — the anti-Tonic angle)
- Submit-a-Take feedback loop (cohort + judge review within 24h)
- Live social-proof feed and cohort Leaderboard
- Studio tier: parent weekly digest, teacher assignment broadcasts, PDF report cards
- Tiered pricing: Free / Pro $12/mo / Studio $29/teacher/mo

---

## About the Design Files

The files in this bundle are **HTML prototype references** built in plain React + Babel. They are **not production code** — they demonstrate intended look, layout, interactions, and copy. Your task is to **recreate these designs in your existing tech stack** (React/Next.js, Vue, SwiftUI, etc.) using its established patterns, routing, and component library. If no stack exists yet, Next.js + Tailwind is the natural fit for this product.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, interaction animations, component states, and copy are all final or near-final. Implement pixel-precisely using your codebase's component system, but pull exact token values from the Design Tokens section below.

---

## Architecture Overview

```
Mobile (iOS/web)           Desktop (web, 1280px+)
────────────────           ────────────────────────
HomeScreen                 Sidebar nav (200px fixed)
PathwaysScreen (list+drill)  DesktopHome
RoomsScreen                  DesktopPathways (master-detail)
PiecesScreen                 DesktopRooms
LogScreen                    DesktopLeaderboard
SessionScreen (full-screen)  DesktopLoop
                             DesktopRecordings
                             DesktopPricing
                             DesktopDigest (parent email preview)
```

---

## Screens / Views

### 1. Home (Desktop)

**Purpose:** Daily launchpad — shows current piece, streak, today's progress, week chart, audition countdown, and live cohort social feed.

**Layout:**
- Padding: `40px` sides, `32px` top
- Row 1: `grid-template-columns: 1.4fr 1fr`, gap `20px`
  - **Hero card** (dark bg `#0f0f0f`, white text): `min-height: 240px`, `border-radius: 14px`, `padding: 28px`. Contains: date micro-label, 44px headline "Pick up where you left off.", active piece name + movement, "Start Practice" CTA button + keyboard shortcut badge.  Drifting ambient particles overlay (18–22 dots, `opacity: 0.18–0.5`, `animation: drift 14–38s infinite`). Breathing dot top-right (`8px` circle).
  - **Right column** (two stacked cards): Streak card (number + 28-cell progress strip) + Today card (minutes / goal + ProgressBar).
- Row 2: dark social-feed strip (`background: var(--color-text-primary)`, `border-radius: 14px`, `padding: 20px 24px`). Live pulse dot + "LIVE · Your cohort" label. 4-row rotating feed of kudos/milestones/joins/submits, updates every 3.2s, slide-in animation `480ms cubic-bezier(0.16,1,0.3,1)`.
- Row 3: `grid-template-columns: 1.4fr 1fr`, gap `20px`
  - **Week chart card**: bar chart `M–S`, today bar full opacity, future bars lighter.
  - **Audition countdown card**: audition name, location, date, days left (large number), ProgressBar of prep progress.
- Row 4: quick-action strip (3 chip buttons: Continue piece, Loop Trainer, Submit a take).

---

### 2. Pathways (Desktop — master-detail)

**Purpose:** Competition/audition-specific prep tracks. Users pick a cohort, see requirements, cohort stats, and submit recorded takes for feedback.

**Layout:** `grid-template-columns: 320px 1fr`

**Left list (320px):**
- Header: "Pathways" (20px) + meta count
- Each row: `padding: 18px 24px`, `border-left: 2px solid` (active = text-primary, inactive = transparent), shows region + flag, pathway name, deadline, days-left badge.

**Right detail:**
- Region micro + flag, Pathway name (32px), days-left counter (36px tabular), enrolled + rank meta.
- **4-up stat strip** (`grid-template-columns: repeat(4, 1fr)`): Cohort avg/week, Cohort avg streak, Requirements ready, Your percentile. Each: micro label, 22px number, 11px "You · …" sub.
- **Requirements list**: each row = `grid-template-columns: auto 1fr auto auto` — status dot (filled circle = done, pulsing inner dot = active, dashed = todo), label + piece name, status text, "Open"/"Re-record" button.
- **Insight pull-quote**: `border-left: 2px solid var(--color-text-primary)`, italic 14px, meta attribution.
- **Submit-a-Take panel**: record CTA, list of past takes. Each take: requirement label, date, duration; judged takes show score/100 pill (dark bg); pending shows "In queue" pill with breathing dot. Judged takes expand to show 2 feedback items (reviewer role + note in quotes).

**Pathways data (four cohorts):**
1. NYSSMA All-State (USA · New York) — 47 days, 1,284 musicians
2. Concours Musical International (Montréal) — 24 days, 412 musicians
3. Eastern Regional Orchestra (USA · Eastern) — 88 days, 2,104 musicians
4. Asia Pro-Track Orchestra Excerpts (Tokyo/Seoul/Shanghai) — continuous, 3,870 musicians

---

### 3. Practice Rooms (Desktop)

**Purpose:** Quiet co-working — mics-off, timers-on. No chat. Users join live rooms or schedule mock auditions.

**Layout:** full-width scroll, `padding: 32px 40px`

- Header: title + meta ("56 musicians together"), two action buttons (Schedule mock audition, Open a room — dark).
- **Filter chips** (scrollable row): All, Live now, Mock Auditions, Excerpts, Bach, Sight-Reading, Asia · Tokyo/Seoul, Eastern US.
- **"Happening now" dark strip**: `background: var(--color-text-primary)`, `border-radius: 12px`, `padding: 16px 20px`. Pulse dot + "HAPPENING NOW" label, live counts ("59 in rooms · 4 mock auditions · Tokyo Don Juan room 14/16 · 12 musicians joined in last hour"), "Quick join →" light button.
- **Room cards grid** (`grid-template-columns: repeat(3, 1fr)`, gap `14px`): each card has LIVE/SCHEDULED pulse, room name (16px 500), piece text, attendee pebbles grid (`14px × 14px` squares, filled = present), host + region footer.
- **How rooms work** explainer: 3-column dashed border box at bottom.

**Room data (6 rooms):** Brahms 3 (7/12), Don Juan Sectional (14/16), Sight-Reading Sprints (4/8), Bach Sonatas (9/12), Pre-screen Mock (3/4, scheduled), Asia Pro-Track (22/30).

---

### 4. Leaderboard (Desktop)

**Purpose:** Hours-practiced ranking within audition cohort. Anonymized below rank #20.

**Layout:** full-width scroll, `padding: 32px 40px`

- Header + scope toggle (week / month / all-time chips right-aligned).
- **Cohort chip row**: NYSSMA All-State · Violin, CMIM · Strings, Asia Pro-Track · Excerpts, Global.
- **4-up climb-stat strip** (`padding: 16px 0`, bordered top + bottom): Your rank, Cohort percentile, Hours behind #1, Pace to overtake #141.
- **Top-3 podium** (`grid-template-columns: 1fr 1.2fr 1fr`, aligned bottom): center slot dark inverted, larger font, `transform: scale(1.02)`. Each pod: rank, region flag, name, instrument, hours (32px), streak + kudos footer.
- **Ranked table** (`grid-template-columns: 60px 1fr 100px 1fr 80px 100px 90px`): Rank, Musician (avatar initial circle + name + instrument), Region, Sparkline (4-bar mini chart), Streak, Hours, Kudos heart button. "You" row highlighted with `background: var(--color-card-fill)`, negative side margins to bleed.
- **Climb hint** (dark full-width bar at bottom): "2.4h to overtake #141 (Sasha B.)" + "Plan today's session" button.

---

### 5. Pricing (Desktop)

**Purpose:** Convert Free → Pro, or Pro → Studio. Justify the subscription.

**Layout:** centered column, `max-width: 1100px`

- Hero: 42px headline (two lines), meta, monthly/yearly toggle pill.
- **3-column plan grid**: Free / Pro / Studio. Pro card: `background: var(--color-text-primary)`, `color: var(--color-bg)`, "Most students" badge (top-right white pill). Each card: plan name, blurb, price (44px), cadence, CTA button, divider, feature list (dot indicators — filled = included, dashed = not).
- **Trust strip**: 4-up stats (7,670 musicians, 142 auditions submitted, 94% practice ≥ 5 days, 30-day money-back).
- **Studio note** bar at bottom.

**Plan details:**
- Free: $0 — 1 piece, no Loop Trainer, no Pathways, no Rooms.
- Pro: $12/mo ($9 yearly) — unlimited everything, Pathways, Rooms, Leaderboard, Submit Takes, Mock Auditions, Annotations.
- Studio: $29/teacher/mo — everything Pro + student dashboard, parent digests, assignment broadcast, feedback on takes, report card PDFs, Stripe payouts.

---

### 6. Parent Digest (Desktop — email preview)

**Purpose:** Preview of the Sunday email parents/guardians receive. Key retention + Studio-tier justification.

**Layout:** centered `max-width: 720px` card, `border-radius: 14px`, email-client chrome header.

Sections (top to bottom):
1. **Email header**: Andante logo mark + "Andante Studio · Weekly Digest", date.
2. **Student name + teacher**: large name (28px), studio + week range.
3. **Hero metric strip** (`grid-template-columns: repeat(4, 1fr)`): hours practiced, days active, pieces worked, takes submitted.
4. **Week bar chart**: 7 bars M–S, Saturday = empty (missed).
5. **Teacher note**: italic 14px quote from teacher.
6. **Assignments for next week**: 4-row checklist with piece name, specific instruction ("loop mm. 41–58 at ♩ 84"), "in app →" link.
7. **Footer**: "You are receiving this because…" + "Open in app" button.

---

### 7. Home (Mobile — iOS)

**Layout:** Full-screen scroll, `padding-bottom: 100px` (above tab bar)

- **Hero card** (dark): 44px greeting headline, active piece name + movement, "Start Practice" CTA. Ambient particle field + breathing dot.
- **Streak card**: number + 28-cell heatmap strip.
- **Today card**: minutes / goal, ProgressBar.
- **Live cohort feed**: rotating 3-row feed, dark bg, "LIVE · NYSSMA ALL-STATE" label.
- **Week chart + audition countdown** cards.

---

### 8. Pathways (Mobile)

**List view:** 4 pathway rows (flag, name, deadline, days-left badge, requirements progress bar).  
**Drill-in view:** back button, name (30px), days countdown, enrolled/rank meta, 2×2 stat grid, requirements list (status dot + label + piece), insight quote, "Submit a take" + "View leaderboard" CTA buttons.

---

### 9. Practice Rooms (Mobile)

- Header + meta, live musician count.
- **Live ribbon** (dark): "12 musicians joined a room in the last hour" + pulse dot.
- Filter chips.
- **Room cards** (vertical stack): LIVE/SCHEDULED dot, room name (15px), attendee pebbles, host + count footer.
- "Open a room" full-width CTA at bottom.

---

### 10. Active Session (Mobile + Desktop)

**Mobile:** Full-screen dark. Timer (large, `font-variant-numeric: tabular-nums`), piece name, focus type chips (Repertoire / Scales / Etudes / Sight-Reading), pause + end controls. Waveform visualization.
**Desktop:** Right panel (400px) slides in, same content.

---

### 11. Loop Trainer (Desktop)

Bar counter, tempo display, A→B range selector, Tempo Ramp toggle (start BPM → target BPM over N bars), Metronome toggle. Track visualization showing A→B loop region highlighted.

---

## Interactions & Behavior

### Navigation
- **Desktop:** Left sidebar `200px` fixed, `overflow: hidden`. Nav items `44px` tall, `border-left: 2px solid` active indicator. Role switcher at bottom.
- **Mobile:** Fixed bottom tab bar `68px`, 5 tabs (Home / Pathways / Rooms / Pieces / Log). Active tab: icon + label both visible, others: icon only (or icon + label, depending on space).
- **Session:** On mobile, starting a session fades out the tab UI and overlays the full-screen SessionScreen (`opacity` transition `200ms`). On desktop, a right panel slides in.

### Pathways drill-in (mobile)
- Tap row → push detail view (slide in from right, `transform: translateX` + `opacity`, `480ms ease-out-expo`).
- Back button at top-left slides back.

### Leaderboard podium
- Three cards animate in with `revealUp` (`480ms cubic-bezier(0.16,1,0.3,1)`) staggered by 90ms. Center card scales to `1.02`.

### Social feed
- Rotates every `3200ms`. New top row slides in with `feedSlide` animation (`480ms`).

### Ambient particles
- 18–22 absolutely-positioned circles, random `x/y` within parent, `opacity: 0.18–0.5`, `animation: drift 14–38s ease-in-out -random delay infinite`.
- Parent must be `position: relative; overflow: hidden`.

### Submit a take
- "Record now" → record modal (not in prototype, implement as native audio capture sheet).
- Judged takes are expanded by default; pending takes show queue position.

### Pricing toggle
- Monthly ↔ Yearly pill swap. Yearly changes Pro price from `$12` to `$9`. Animate with CSS transition on background/color.

### Keyboard shortcuts (desktop)
- `S` → Start Practice session
- `⌘J` → Join study circle
- `⌘K` → command palette (not prototyped, implement as standard)

---

## State Management

Key state:
```
user.role: "musician" | "teacher"
user.plan: "free" | "pro" | "studio"
session.active: boolean
session.seconds: number
session.paused: boolean
session.activePiece: Piece
session.focusType: "Repertoire" | "Scales" | "Etudes" | "Sight-Reading"
pathways.selectedId: string
leaderboard.cohort: string
leaderboard.scope: "week" | "month" | "all-time"
rooms.filter: string
pricing.yearly: boolean
```

---

## Design Tokens

### Colors (Light mode)
| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#ffffff` | Page background |
| `--color-text-primary` | `#0f0f0f` | Body text, CTAs, dark cards |
| `--color-text-secondary` | `rgba(15,15,15,0.45)` | Sub-labels |
| `--color-text-muted` | `#888888` | Placeholders, metadata |
| `--color-card-fill` | `#f4f4f4` | Card backgrounds |
| `--color-card-fill-deep` | `#ececec` | Nested card backgrounds |
| `--color-border` | `#e0e0e0` | All borders (0.5px) |
| `--color-track-empty` | `#e0e0e0` | Empty progress track |
| `--color-bar-past` | `#d0d0d0` | Past week chart bars |

### Colors (Dark mode)
| Token | Value |
|---|---|
| `--color-bg` | `#0a0a0a` |
| `--color-text-primary` | `#f5f5f5` |
| `--color-card-fill` | `#161616` |
| `--color-border` | `#232323` |
| `--color-track-empty` | `#232323` |

### Typography
- **Font family:** Inter (Google Fonts), weight 400/500. `font-feature-settings: 'ss01', 'cv11'`
- **Stat numbers (large):** 40–48px, weight 500, `letter-spacing: -1.4px`, `font-variant-numeric: tabular-nums`
- **Section headers:** 14px, weight 500, `letter-spacing: 0.05em`, `text-transform: uppercase`
- **Body / card labels:** 14px, weight 400–500, `letter-spacing: -0.2px`
- **Micro labels:** 11px, weight 400, `letter-spacing: 1.5px`, `text-transform: uppercase`, muted color
- **Meta:** 12px, `color: var(--color-text-secondary)`

### Spacing
| Token | Value |
|---|---|
| Screen margin | `24px` (mobile), `40px` (desktop) |
| Card gap | `12px` |
| Section gap | `32px` |
| Card padding | `20–28px` |

### Border Radius
| Token | Value |
|---|---|
| Card | `12–14px` |
| Button | `10–12px` |
| Chip | `999px` |
| Input | `10px` |
| Avatar | `999px` |

### Border width
All dividers and card borders: `0.5px` (use `border: 0.5px solid`). Do not use `1px` — the product intentionally uses hairline borders.

### Easing
- `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` — all entrance animations
- `--ease-in-quart: cubic-bezier(0.5, 0, 0.75, 0)` — exit animations

### Animations
```css
@keyframes revealUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.6); opacity: 0.4; }
}
@keyframes drift {
  0%   { transform: translate3d(0, 0, 0); opacity: 0; }
  10%  { opacity: 1; }
  50%  { transform: translate3d(28px, -22px, 0); }
  90%  { opacity: 1; }
  100% { transform: translate3d(0, 0, 0); opacity: 0; }
}
@keyframes feedSlide {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## Component Inventory

| Component | Description |
|---|---|
| `ProgressBar` | Animated thin bar, `animateOnMount` grows from 0 on mount |
| `StatNumber` | Counts up from 0 on mount, `font-variant-numeric: tabular-nums` |
| `WeekChart` | 7-column bar chart, today bar full opacity, past at 60%, future empty |
| `Chip` / `ChipRow` | Horizontally scrollable pill chips, active = inverted |
| `BottomSheet` | Modal sheet from bottom, backdrop blur |
| `NavBar` | Fixed bottom 5-tab bar (mobile only) |
| `Icon` | Thin stroke icon set (home, timer, music, list, target, users, play, plus) |
| `AmbientField` | `count` random drifting dots, absolutely positioned within parent |
| `SocialFeed` | Auto-rotating 4-row feed of cohort events |
| `ProLock` | Inline paywall chip — shows PRO badge + Upgrade button |
| `TakeStatusPill` | Score/100 pill (judged) or "In queue" breathing pill (pending) |
| `ReqDot` | Requirement status dot (done=filled, active=pulsing, todo=dashed) |
| `Spark` | 4-bar mini sparkline (leaderboard rows) |

---

## Assets

- **Icons:** Implemented as inline SVG paths (Lucide-style, `stroke-width: 1.5`). No external icon library required; re-implement using your app's icon system (Lucide, Heroicons, etc.).
- **Fonts:** Inter from Google Fonts — `https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap`
- **No images** used in the prototype — all visuals are CSS/SVG.

---

## Files in This Bundle

| File | Description |
|---|---|
| `index.html` | Entry point — loads all scripts, sets up root div, imports Google Fonts |
| `styles.css` | All design tokens, resets, utility classes, animations |
| `components.jsx` | Shared primitives: Icon, ProgressBar, StatNumber, WeekChart, NavBar, BottomSheet |
| `screens-1.jsx` | Mobile: HomeScreen, SessionScreen, LoopTrainer, RecordingsScreen |
| `screens-2.jsx` | Mobile: PiecesScreen, LogScreen, GoalsScreen, OnboardingScreen, TeacherScreen |
| `screens-mobile-extras.jsx` | Mobile: MobilePathways, MobileRooms |
| `desktop.jsx` | Desktop shell, sidebar nav, DesktopHome, Session, Loop, Recordings, Log, Goals |
| `desktop-extras.jsx` | Desktop: DesktopPathways, DesktopRooms, DesktopLeaderboard, AmbientField |
| `monetization.jsx` | Desktop: DesktopPricing, DesktopDigest, ProLock, SocialFeed, SubmitTakePanel |
| `app.jsx` | Root App component, sample data, MobileApp, Tweaks panel wiring |

---

## Recommended Implementation Stack

If starting fresh:
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS with a custom theme extending the token values above
- **Auth:** Clerk (fast, supports teacher/student roles)
- **DB:** Supabase (Postgres, realtime for Practice Rooms presence)
- **Audio capture:** `MediaRecorder` API for Submit-a-Take recordings; store on S3/Cloudflare R2
- **Payments:** Stripe Billing (monthly/yearly subscriptions + Studio per-seat metering)
- **Email (Parent Digest):** Resend + React Email — the digest design maps directly to React Email components
- **Realtime presence (Rooms):** Supabase Realtime channels or Liveblocks

---

*Generated by Andante design prototype · November 2024*
