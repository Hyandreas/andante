-- ────────────────────────────────────────────────────────────────────────────
-- Andante — pathway seed data
-- ────────────────────────────────────────────────────────────────────────────

insert into public.pathways (id, region, flag, name, deadline_label, deadline_date, enrolled_count, insight) values
  ('ny-allstate',    'USA · New York',         '🇺🇸', 'NYSSMA All-State',                  'Apr 12 · audition window', '2026-04-12', 1284, 'Top-quartile All-State applicants log ≥ 11h/week and a 30-day streak by submission.'),
  ('concerto-cmim',  'International · Montréal','🇨🇦', 'Concours Musical International',    'Jan 18 · video round',     '2026-01-18',  412, 'CMIM finalists average 14h+ and submit ≥ 6 takes per movement before final cut.'),
  ('regionals-east', 'USA · Eastern Region',   '🇺🇸', 'Eastern Regional Orchestra',        'Mar 02 · live audition',   '2026-03-02', 2104, 'Mock-audition recordings 3+ weeks early correlate with 2.4× advance rate.'),
  ('asia-orch',      'Asia · Tokyo / Seoul / Shanghai', '🌏', 'Pro-Track Orchestra Excerpts', 'Continuous',              null,         3870, 'Asia pro-track median is 16h/week with multi-tempo loop-trainer drills.')
on conflict (id) do nothing;

insert into public.pathway_requirements (pathway_id, position, label, piece_label) values
  ('ny-allstate', 1, 'Solo from NYSSMA Manual Lvl 6',   'Bach Sonata No. 1 in G minor'),
  ('ny-allstate', 2, 'Two contrasting etudes',          'Kreutzer No. 32 + Rode No. 7'),
  ('ny-allstate', 3, 'Three-octave scale (judge''s choice)', 'All major + harmonic minor'),
  ('ny-allstate', 4, 'Sight-reading',                   '—'),

  ('concerto-cmim', 1, 'Major concerto, mvt. I',        'Sibelius Concerto in D minor'),
  ('concerto-cmim', 2, 'Romantic showpiece',            'Wieniawski Polonaise'),
  ('concerto-cmim', 3, 'Bach unaccompanied movement',   'Bach Sonata No. 1 — Adagio'),
  ('concerto-cmim', 4, 'Living composer work',          '—'),

  ('regionals-east', 1, 'Beethoven 5 — mvt. III scherzo','Excerpt · mm. 1–80'),
  ('regionals-east', 2, 'Mozart 39 — mvt. IV',          'Excerpt · mm. 1–60'),
  ('regionals-east', 3, 'Strauss Don Juan opening',     '—'),
  ('regionals-east', 4, 'Sight-reading',                '—'),

  ('asia-orch', 1, 'Don Juan opening',                  'Strauss · mm. 1–62'),
  ('asia-orch', 2, 'Ein Heldenleben Concertmaster solo','Strauss · Reh. 9'),
  ('asia-orch', 3, 'Schumann 2 — mvt. II Scherzo',      'Excerpt'),
  ('asia-orch', 4, 'Tchaikovsky 4 — mvt. III pizzicato','—'),
  ('asia-orch', 5, 'Mozart 35 — mvt. IV opening',       'Excerpt')
on conflict do nothing;
