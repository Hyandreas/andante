# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Next.js)
pnpm build        # Production build
pnpm start        # Start production server
```

No lint or test scripts are configured yet. TypeScript checking: `pnpm tsc --noEmit`.

To regenerate Supabase types once a project is provisioned:
```bash
supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
```

## Architecture

**Andante** is a practice-tracking SaaS for classical musicians. Next.js 15 App Router, Tailwind CSS v4, Supabase (auth + database), Stripe (subscriptions), Zustand (client state).

### Route groups

| Group | Path | Purpose |
|---|---|---|
| `(app)` | `/home`, `/pathways`, `/rooms`, `/leaderboard`, `/loop`, `/pieces`, `/log`, `/session`, `/recordings`, `/goals` | Authenticated musician app |
| `(auth)` | `/login`, `/signup` | Auth pages |
| `(onboarding)` | `/onboarding` | Post-signup onboarding |
| `(teacher)` | `/teacher` | Teacher/studio dashboard |
| (root) | `/` (marketing homepage), `/pricing`, `/privacy`, `/digest-preview` | Public pages |

The `(app)` layout renders `DesktopSidebar` + `MobileNav` and assumes a valid Supabase session (auth gating is in middleware).

The marketing homepage `/` redirects logged-in users to `/home` (only when Supabase is configured); otherwise it renders the public landing experience.

### Supabase

Two clients: `src/lib/supabase/server.ts` (Server Components / Route Handlers, uses `@supabase/ssr` cookie adapter) and `src/lib/supabase/client.ts` (browser). Always use `getSupabaseServerClient()` in server code — never import the browser client from a server file.

The database schema is in `supabase/schema.sql`; seed data in `supabase/seed.sql`. Types are hand-maintained in `src/lib/supabase/types.ts` until a Supabase project is provisioned.

The app falls back to placeholder Supabase credentials when env vars are missing (`src/lib/env.ts`), so the UI can be developed offline. `isSupabaseConfigured()` guards code paths that require a live project.

### Session timer

The active practice session is globally tracked in `src/store/session-store.ts` (Zustand). The actual timer runs in `src/workers/timer-worker.ts` — a Web Worker that posts `TICK` messages to avoid main-thread throttling. Sessions ended while offline are queued in IndexedDB via `src/lib/offline-sessions.ts` and flushed to Supabase on next load.

### Payments

Stripe Checkout is triggered via `POST /api/checkout`. The webhook handler at `POST /api/stripe/webhook` updates the `subscriptions` table. Three price IDs are needed: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_STUDIO_MONTHLY`.

### Parent digest

A weekly email (Sunday) is sent via `GET /api/cron/parent-digest` (protected by `CRON_SECRET`). The email template lives in `src/lib/digest-email.ts` and is previewed at `/digest-preview`.

### Design tokens

All color, spacing, radius, and animation tokens are CSS custom properties defined in `src/app/globals.css`. They are bridged into Tailwind v4 via `@theme inline`. Always use token names (e.g. `var(--color-card-fill)`, `bg-card-fill`) — never hardcode colors. All borders are `0.5px` (hairline); do not use `1px`.

Theme is stored in `localStorage` under the key `theme` (`"light"` | `"dark"`) and applied via `data-theme` attribute on `<html>`. The inline script in `src/app/layout.tsx` sets this before first paint to avoid flash.

### Marketing homepage — "The Living Score" (WebGL)

The logged-out `/` landing page is a single scroll-driven 3D experience. `src/components/marketing/marketing-homepage.tsx` is a client component that renders the overlay copy (real DOM, server-rendered for SEO) and mounts a full-viewport WebGL canvas. The Three.js engine lives in `src/components/marketing/living-score.ts` and is **dynamically imported** (`import("./living-score")`) so `three` stays out of the initial route bundle.

- `three` is a dependency (`pnpm add three`); addons are imported from `three/examples/jsm/postprocessing/*`.
- All styles are scoped under `.andante-homepage` in `src/components/marketing/homepage.css`; fonts bridge to the app's `--font-inter` / `--font-display`. The page is always dark (pure black void, no fog) regardless of `data-theme`, and honors `prefers-reduced-motion` / the app's `data-motion="off"`.
- A scroll-driven camera flies a continuous drone path (keyframe table `KEYS` in `living-score.ts`) through a glowing "score" ribbon; copy crossfades per act.
- **Audio**: the **SOUND** toggle plays a looping track from `public/audio/homepage.mp3` (path = `AUDIO_SRC` in `living-score.ts`). It's off by default and starts on click (browser autoplay policy), with a `setInterval` fade so it survives a backgrounded tab. If no file is present the toggle marks itself unavailable. Drop in a track you have the rights to — see `public/audio/README.md`.

### SEO & AI discoverability

`src/app/robots.ts`, `src/app/sitemap.ts`, and `src/app/llms.txt/route.ts` are generated from `NEXT_PUBLIC_SITE_URL`. Only public pages (`/`, `/pricing`, `/privacy`, `/llms.txt`) are allowed/listed; the signed-in app and APIs are disallowed. `robots.ts` also adds explicit allow rules for AI-search crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.). The homepage emits `SoftwareApplication` JSON-LD. Keep all three in sync when adding/removing public routes.

### Privacy & COPPA

Andante is intended for users **aged 13+**. The privacy policy lives at `/privacy` (`src/app/privacy/page.tsx`) and states we do not knowingly collect personal information from children under 13. The onboarding age question (`src/lib/first-run/config.ts`) therefore offers no "Under 13" option. If you add any flow that could collect data from under-13s, gate it (block or parent-managed) and update the policy.

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLIC_KEY
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_YEARLY
STRIPE_PRICE_STUDIO_MONTHLY
RESEND_API_KEY
DIGEST_FROM_EMAIL
CRON_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```
