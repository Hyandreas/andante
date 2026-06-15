# Homepage audio

The marketing homepage ("The Living Score") plays a looping track when the
visitor enables sound with the **SOUND** toggle (bottom-left). It is **off by
default** and only starts after a click (browser autoplay policy).

## Add a track

Drop an audio file here named exactly:

```
public/audio/homepage.mp3
```

It will be served at `/audio/homepage.mp3` and picked up automatically — no code
change needed. To use a different name/path, edit `AUDIO_SRC` in
`src/components/marketing/living-score.ts`.

If no file is present, the toggle simply marks itself unavailable and nothing
breaks.

## Licensing — important

Classical *compositions* by composers like Tchaikovsky are public domain, but a
specific **recording** of a performance has its own copyright (the orchestra and
label). Only use:

- a recording you own / have a license for, or
- a genuinely public-domain / CC0 recording — e.g. from
  [Musopen](https://musopen.org/) (filter for Public Domain / CC0).

Do **not** drop in a ripped commercial recording.

## Practical notes

- Keep it reasonably small (a few MB). For a long movement, consider trimming to
  a ~1–3 min loop, or host it on a CDN / Supabase Storage and point `AUDIO_SRC`
  at that URL instead of committing a large binary to the repo.
- `mp3` is the safest format for cross-browser playback.
