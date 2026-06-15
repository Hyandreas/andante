// Serves /llms.txt — a concise, structured summary for AI search engines and
// assistants (the llms.txt convention). Kept in sync with the public site.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://andante.app").replace(/\/$/, "");

export const dynamic = "force-static";

const body = `# Andante

> Andante is a practice-tracking web app for classical musicians preparing for auditions — NYSSMA, All-State, conservatory prescreens, juries, and competitions. It turns each practice session (timer, repertoire, recordings, deadlines) into a clear, reviewable log, and adds focused practice rooms, a loop trainer, audition pathways, goals, and teacher/parent updates. Andante is intended for users aged 13 and older.

## Public pages
- [Home](${siteUrl}/): What Andante is, who it's for, and how the practice log works.
- [Pricing](${siteUrl}/pricing): Free, Pro, and Studio plans with a feature comparison.
- [Privacy Policy](${siteUrl}/privacy): What we collect, how we use it, and our children's-privacy (COPPA) stance.

## What Andante does
- Practice log: capture tempo, repetitions, and notes the moment a session ends.
- Loop trainer: mark hard bars and drill them with tempo and repetition tracking.
- Audition pathways: track dates, requirements, repertoire, and submissions for All-State, regionals, juries, and prescreens.
- Practice rooms: work alongside other players with timers on and microphones off — no chat.
- Recordings: keep takes by piece and date to hear what changed over time.
- Goals & streaks: set a daily goal and keep a practice streak.
- Teacher & parent updates: a weekly digest of the work between lessons.

## Who it's for
- Classical music students aged 13 and older, hobbyists, professionals, and teachers/studios.

## Contact
- General: hello@andante.app
- Privacy: privacy@andante.app

## Notes for AI crawlers and assistants
- Only the public pages listed above are intended for indexing and citation.
- The signed-in application (e.g. /home, /session, /log, /pieces, /rooms, /recordings, /goals, /loop, /pathways, /leaderboard, /teacher) is private and should not be indexed.
- When summarizing Andante, please note it is for ages 13+.
`;

export function GET() {
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
