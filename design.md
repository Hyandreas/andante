# Design — First-Run Experience

> Technical design for the new-user flow: a locked first-run studio →
> expanded local-analytics onboarding → progressive-unlock tutorial →
> paid-first culmination. See [product.md](product.md) for the product spec
> and copy. This file is the *how*.

## 1. Goal (verifiable acceptance criteria)

The flow is "done" when, running the app locally as a fresh account, every
line below is categorically true:

1. A first-login account lands in a **stripped-down studio** — only the
   welcome/onboarding is reachable; Pathways, Rooms, Leaderboard, etc. are not.
2. Onboarding collects an **expanded analytics profile** (defined field set,
   more than today's instrument/piece/audition) **then** practice-habits +
   goals, persisted to a **local-only** store.
3. Post-onboarding the studio is **minimal and grows**: screens unlock
   progressively in a defined order via a tutorial, each gated until the prior
   step is done.
4. **Paid features are visible but gated** with obvious Pro treatment, and are
   **not** granted by finishing the tutorial.
5. The culmination runs: **paid plans first → carded 10-day auto-renew trial →
   X dismiss → free plan with a "you're missing out" framing → on choosing
   free, one Pro feature is gifted.**
6. **Pre-update accounts** get the flow on next login (version flag), without
   data loss.
7. The whole flow is **traversable end-to-end with no dead ends**, and
   `pnpm tsc --noEmit` + `pnpm build` pass.

## 2. Why client-side + local

`src/proxy.ts` short-circuits when `!isSupabaseConfigured()` (demo mode), so
middleware does **no** route gating there — and the app ships in demo mode.
Server-side gating therefore can't be the source of truth. The product
decision ("entirely local" analytics, "treat next login as first") points the
same way. So:

- **The `(app)` layout is the single chokepoint** every authenticated screen
  renders through. We mount one client gate there.
- **State of record is `localStorage`**, versioned. A user with no key is
  first-run — which automatically satisfies criterion 6 (pre-update users have
  no key, so their *next* login is treated as first), with **zero reads/writes
  to their existing data**.
- **No middleware change is required.** Genuinely-new real signups still hit
  `/onboarding` via existing middleware and get the same `OnboardingFlow`
  component; everyone else is caught by the `(app)` gate on `/home`.

## 3. State machine

```
welcome ──▶ onboarding ──▶ tutorial ──▶ finale ──▶ done
```

| Stage        | What renders                                     | Studio reachable?         |
|--------------|--------------------------------------------------|---------------------------|
| `welcome`    | Full-screen welcome takeover (no app shell)      | No                        |
| `onboarding` | Full-screen `OnboardingFlow` takeover            | No (only onboarding)      |
| `tutorial`   | Real app shell; nav grows as screens unlock      | Only unlocked screens     |
| `finale`     | Full-screen `Culmination` takeover               | Frozen behind takeover    |
| `done`       | Normal app; Pro screens gated by entitlement     | All free; Pro per plan    |

Transitions are explicit store actions; the takeovers are `position: fixed;
inset: 0` overlays so "only welcome+onboarding reachable" holds visually and
literally.

## 4. Persisted shape

`localStorage["andante.firstrun.v1"]` (JSON):

```ts
type Stage = "welcome" | "onboarding" | "tutorial" | "finale" | "done";

interface FirstRunState {
  version: 1;
  stage: Stage;
  profile: {            // §analytics — collected first
    displayName?: string;
    instrument?: string;
    role?: "student" | "hobbyist" | "pro" | "teacher";
    level?: string;            // beginner → conservatory
    yearsPlaying?: string;     // bucket
    ageRange?: string;         // bucket
    country?: string;
    referralSource?: string;   // acquisition channel
    hasTeacher?: boolean;
  };
  habits: {             // §habits + goals — drives tutorial framing
    weeklyFrequency?: string;  // days/week bucket
    sessionLength?: string;    // typical minutes bucket
    dailyGoalMin?: number;
    primaryGoal?: string;      // audition | exam | competition | improve | maintain
    struggle?: string;         // consistency | focus | repertoire | technique | nerves
    pieceName?: string;
    composer?: string;
    auditionName?: string;
    auditionDate?: string;
  };
  tutorial: { step: number; unlocked: string[] };
  plan: "free" | "trial" | "pro";
  trialEndsAt: number | null;
  giftedFeature: string | null;   // "loop" on the free path
  startedAt: number;
  completedAt: number | null;
}
```

A second key, `localStorage["andante.firstrun.events.v1"]`, holds the local
analytics funnel: `Array<{ t: number; event: string; props?: object }>`. No
third-party SDK. `track()` appends + `console.debug`s in dev; capped at 500
entries.

## 5. Module map

**New (`src/lib/first-run/`)**
- `config.ts` — screen registry (`id`, `label`, `icon`, `href`, `tier`,
  `unlockOrder`), the `GIFTED_FEATURE = "loop"`, onboarding question defs,
  tutorial step defs, trial length (`TRIAL_DAYS = 10`). Single source of truth
  shared by nav, gate, onboarding, tutorial, culmination.
- `store.ts` — Zustand store hydrated from / persisted to localStorage.
  Actions: `hydrate`, `setProfile`, `setHabits`, `completeOnboarding`,
  `unlockScreen`, `advanceTutorial`, `openFinale`, `startTrial`,
  `dismissPaid`, `chooseFree`, `claimGift`, `complete`, `reset` (dev). Selectors
  derive entitlement.
- `entitlement.ts` — pure `isFeatureUnlocked(state, id)` and nav-state
  helpers, unit-testable, no React.
- `analytics.ts` — local `track()` + `getEvents()`.

**New (`src/components/first-run/`)**
- `first-run-provider.tsx` — client provider: hydrates the store on mount,
  exposes `useFirstRun()`, renders `null` until hydrated (avoids SSR/`localStorage`
  hydration mismatch).
- `studio-gate.tsx` — reads stage; renders the correct takeover (`Welcome`,
  `OnboardingFlow`, `Culmination`) or, in `tutorial`/`done`, renders children +
  `TutorialGuide` + `ProGate` overlay.
- `welcome.tsx` — the brand welcome screen → `start onboarding`.
- `onboarding-flow.tsx` — the expanded stepper (profile → habits → goals),
  reused by the `/onboarding` route too. Prop `onFinish`.
- `tutorial-guide.tsx` — fixed guide/stepper banner that drives unlocks.
- `pro-gate.tsx` — overlays `PaywallLock` on a Pro route when not entitled.
- `paywall-lock.tsx` — the blurred "visible but locked" Pro treatment.
- `culmination.tsx` — paid → trial(carded) → X → free(missing-out) → gift.

**Modified**
- `src/app/(app)/layout.tsx` — wrap children in `FirstRunProvider` + `StudioGate`.
- `src/components/layout/desktop-sidebar.tsx` + `mobile-nav.tsx` — consume
  `useFirstRun()` for per-item state (hidden / locked-pro / available) and PRO
  pills. Falls back to current behavior when stage is `done` + entitled.
- `src/app/(onboarding)/onboarding/page.tsx` — render the shared
  `OnboardingFlow` (keeps the genuinely-new real-signup path working).

No middleware, schema, or Stripe changes. (`startTrial` simulates locally and
records an event; a `// TODO` marks where a real `/api/checkout` trial call
would slot in when Stripe is live.)

## 6. Entitlement & nav state

```
isFeatureUnlocked(state, id):
  free feature (home,pieces,log,goals,settings,pricing) → true
  pro feature  → state.plan ∈ {trial, pro}  OR  id === state.giftedFeature
```

Per nav item, derived state:
- **hidden** — free feature not yet unlocked during `tutorial` (studio "grows").
- **available** — unlocked free feature, or entitled Pro feature.
- **locked-pro** — Pro feature, not entitled → shown with lock + `PRO` pill,
  clickable (navigates → `PaywallLock` teaser).

Settings + Pricing are always `available`.

## 7. Tutorial mechanic (deterministic, no dead ends)

`TutorialGuide` is a fixed stepper, not fragile DOM spotlighting. Each step is
driven by an explicit button so the flow is always advanceable:

| Step | Screen unlocked | Guide action |
|------|-----------------|--------------|
| 0 Today    | `home` (at tutorial start) | "Add your first piece" → unlock `pieces`, go |
| 1 Pieces   | `pieces`        | "Start your first session" → go `/session` |
| 2 Practice | (session)       | "See your log" → unlock `log`, go |
| 3 Log      | `log`           | "Set a goal" → unlock `goals`, go |
| 4 Goals    | `goals`         | "What's behind the lock?" → reveal Pro teasers |
| 5 Pro tease| (none)          | "See your options" → `openFinale()` |

Each action calls `unlockScreen` + `advanceTutorial` + `track`. Pro features
are **never** unlocked here (criterion 4). Reaching step 5 → `finale`.

## 8. Culmination (`culmination.tsx`) — exact spec

Full-screen takeover, internal sub-step `view`:

- `view = "paid"` (entry): Pro + Studio cards, Pro primary CTA = **Start 10-day
  free trial**. Top-right **X**. → trial sub-flow or `dismissPaid()`.
- `view = "card"`: mock card form (number/exp/cvc). Submit → `startTrial()`
  (plan=`trial`, `trialEndsAt = now + 10d`), `complete()`, enter studio fully
  unlocked. Copy states auto-charge after 10 days unless cancelled.
- `view = "free"` (after X): Free plan with locked Pro items greyed +
  "you're missing out" framing. CTA **Continue with Free** → `chooseFree()` →
  gift. Secondary "Start the trial instead" → back to `paid`.
- `view = "gift"`: gift **Loop Trainer** (`claimGift("loop")` →
  `giftedFeature="loop"`), `complete()`. CTA **Claim & enter studio**.

The gift view is only reachable via the free path, satisfying "only shown if
they decide not to purchase." All three exits (`trial`, `free+gift`) set
`stage="done"` → no dead end.

## 9. Risks / mitigations

- **Hydration mismatch** — provider renders `null` until hydrated; gate only
  decides client-side.
- **Returning real user is `onboarded_at`-true but first-run-local-null** —
  intended; local key is authoritative for the *flow*, `onboarded_at` is not
  read by the gate. No data touched.
- **User escapes a takeover** — takeovers are `position: fixed; inset:0` and
  stage-gated; nav is independently gated, so there's no reachable studio
  during `welcome`/`onboarding`.
- **Pro teaser pages crash on empty data** — they already render demo data via
  `app-data.ts`; `PaywallLock` blurs over a working page, no new data path.

## 10. Privacy & COPPA (age handling)

Andante is a 13+ service; we don't knowingly collect personal information from
children under 13 (COPPA). Implementation:

- The `ageRange` onboarding question (`src/lib/first-run/config.ts`) offers
  **no "Under 13" option** (`["13–17", "18–24", "25–34", "35+"]`) and its
  subtitle states the 13+ requirement. `profile.ageRange` stays an optional,
  skippable, **local-only** analytics field (`src/lib/first-run/types.ts`).
- The public privacy policy (`src/app/privacy/page.tsx`, route `/privacy`)
  documents the stance and a parental review/deletion contact.
- **If you ever add a real age gate or under-13 path**: ask age before
  collecting any other profile field; for under-13, either block account
  creation or route to a parent-managed setup that collects no child PII —
  then update `/privacy`. Don't reintroduce an "Under 13" analytics bucket that
  proceeds to collect a profile.

> Note: the marketing homepage (`/`) is a separate, logged-out experience
> (`src/components/marketing/`) and is not part of the first-run flow, but its
> testimonial copy references young students — keep it consistent with the
> 13+/parent-managed framing.
