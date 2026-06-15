# Product — First-Run Experience

> The new-user journey for Andante: ease a fresh musician in without
> overwhelming them, prove the app is worth needing, and present the paid
> moment honestly but persuasively. Technical design in [design.md](design.md).

## Problem

Andante has a lot of surface area — Pathways, Practice Rooms, Leaderboards,
Loop Trainer, Recordings, Goals, Log. For a brand-new user that's overwhelming
on first login. We want first-run to feel like *one calm room that grows*, not
a control panel.

## Success metric (artifact-verifiable)

We deliberately do **not** measure acquisition/behavior here (not something we
can affirm ourselves). Success = the 7 acceptance criteria in
[design.md §1](design.md) are all categorically true in a local run, and
`tsc` + `build` pass. Acquisition/conversion measurement is the owner's to run
later; the local event log (§Analytics) is the hook for it.

## The journey

### 1. Welcome (stage `welcome`)
A single quiet screen: logo, one line ("Let's set up your studio."), one
button. No app chrome. Sets the tone — calm, not a dashboard.

### 2. Onboarding (stage `onboarding`) — analytics first, then habits/goals

A full-screen stepper. **Phase A is analytics** (more than today's 3 fields),
**Phase B is practice habits + goals** (these shape the tutorial framing).
Every answer is optional-friendly (skippable where reasonable) to protect
completion, but the fields exist and persist locally.

**Phase A — About you (analytics):**
1. Display name
2. Instrument (existing list)
3. Role — student / hobbyist / pro / teacher
4. Level — beginner / intermediate / advanced / conservatory
5. Years playing — <1 / 1–3 / 3–7 / 7+
6. Age range — 13–17 / 18–24 / 25–34 / 35+  *(no "under 13" option — Andante is 13+; see [Privacy & COPPA](#privacy--coppa))*
7. Country (analytics: geography)
8. Do you study with a teacher? — yes / no
9. **How did you hear about us?** — TikTok / YouTube / teacher / friend /
   search / other  *(acquisition channel — high-value analytics)*

**Phase B — Your practice (habits + goals):**
10. How often do you practice now? — daily / most days / few times a week / rarely
11. Typical session length — <20 / 20–45 / 45–90 / 90+ min
12. Daily goal (minutes) — drives the streak/goal UI
13. What are you here to do? — audition prep / exam (NYSSMA/ABRSM) /
    competition / improve generally / maintain
14. Biggest struggle — consistency / focus / repertoire / nerves / technique
15. First piece + composer (existing)
16. Next audition/deadline (existing, skippable)

On finish: write `profile` + `habits` locally, set stage → `tutorial`,
`track("onboarding_completed")`.

### 3. Tutorial (stage `tutorial`) — the studio grows

The app shell appears, but **minimal**: only **Today** is in the nav. Each
guided step unlocks the next free screen, so the studio visibly grows as they
go. Free unlock order:

**Today → Pieces → (first session) → Log → Goals → Pro teaser**

The guide banner is calm and skippable-forward; copy is tailored by their
Phase-B answers (e.g. if `primaryGoal = audition`, framing leans on the
deadline). Paid features stay **locked and visible** the whole time — never
granted by the tutorial.

### 4. Paid vs free split

Mirrors the existing pricing page, now actually enforced in-app.

| Free (unlocked in tutorial) | Pro (visible, locked) |
|-----------------------------|-----------------------|
| Today / home                | Pathways              |
| Pieces (1 active)           | Loop Trainer ⭐ *(gift)* |
| Log + weekly chart          | Recordings + annotations |
| Goals + streak              | Practice Rooms        |
| Settings, Pricing           | Leaderboards / cohort percentile |

Pro items show a lock + `PRO` pill in nav; clicking one navigates to the real
screen under a blurred **PaywallLock** teaser ("This is a Pro feature") — so
the value is *visible* but obviously gated.

### 5. Culmination (stage `finale`) — paid-first, honest, persuasive

Exactly as specified by the owner:

1. **Paid plans first.** The end screen opens on Pro + Studio. The headline
   ties back to what they told us ("You're prepping for {audition} in {N}
   weeks — here's the room built for that."). Pro's primary CTA is **Start your
   10-day free trial**.
2. **Carded 10-day trial.** Choosing it shows a card form. Copy is honest:
   "Card required. Your trial runs 10 days; we'll charge {price} on {date}
   unless you cancel — cancel anytime in Settings." Submitting starts the trial
   (full Pro access) and enters the studio.
3. **X = no to paid.** The top-right X drops them to the **Free plan**, framed
   so the trade-off is tangible — the locked Pro features are listed, greyed,
   under "What you'll be practicing without." (Persuasive, not nagging.)
4. **Free → gift.** Confirming Free reveals a parting gift: **Loop Trainer,
   free, forever**. This is the one Pro feature we give away, and it only
   appears on the free path. It's a sticky daily tool that makes the *rest* of
   Pro more desirable — without handing over the audition-prep suite
   (Pathways, Recordings, Rooms, Leaderboards, feedback).

All paths end at stage `done` with no dead end.

## Why Loop Trainer is the gift

It's a high-frequency *utility* (tempo ramp / A–B looping) that builds a daily
habit and keeps users in the app — but it isn't the core audition-prep value
(that's Pathways + Recordings + Rooms + cohort feedback). Gifting it creates
appetite for Pro rather than cannibalizing it.

## Privacy & COPPA

Andante is intended for users **aged 13 and older**. To stay clear of COPPA
(which governs collection of personal information from children under 13), we
**do not knowingly collect personal information from under-13s**:

- The onboarding age question offers no "under 13" option, and its subtitle
  states the 13+ requirement.
- A parent or teacher may run Andante for a younger student; the account is the
  adult's and we don't collect personal info directly from the child.
- The public [Privacy Policy](/privacy) documents this stance and a
  parental review/deletion contact (`privacy@andante.app`).

If any future flow could collect data from an under-13 user, it must be gated
(blocked or parent-managed) before this stance can be relied on. (The marketing
homepage testimonials reference young students with a parent — copy should stay
consistent with the 13+/parent-managed framing.)

## Analytics (local)

A local event log records the funnel so the owner can wire a real provider
later: `first_run_started`, `welcome_viewed`, `onboarding_step`,
`onboarding_completed`, `tutorial_started`, `screen_unlocked`,
`tutorial_step_completed`, `tutorial_completed`, `paywall_viewed`,
`trial_started`, `paid_dismissed`, `free_chosen`, `gift_claimed`,
`first_run_completed`. Profile + habits answers are attached to
`onboarding_completed`.

## Out of scope (intentional)

- Real Stripe trial billing (simulated locally; seam left for `/api/checkout`).
- Rewriting each screen's data layer to a true empty state — "minimal/grows"
  is delivered by progressive nav unlock, not by emptying every page.
- Server-side enforcement (demo mode bypasses middleware; gating is client-side
  by design).
