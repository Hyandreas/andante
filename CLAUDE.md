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
| (root) | `/pricing`, `/digest-preview` | Public pages |

The `(app)` layout renders `DesktopSidebar` + `MobileNav` and assumes a valid Supabase session (auth gating is in middleware).

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
```
