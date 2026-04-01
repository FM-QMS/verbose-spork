-- Run this entire script in your Supabase SQL editor
-- Dashboard → SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS checkins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,           -- 'advocate' or 'fitter'
  week_date   date NOT NULL,           -- ISO date of Monday of that week
  week_label  text,                    -- human-readable e.g. "Week of Apr 1 – Apr 5, 2026"
  submitter   text,
  notes_meta  text,
  metrics     jsonb DEFAULT '{}',      -- { cgm: { cgm_unfilled: 204, ... }, shoe: {...}, ... }
  advocates   jsonb DEFAULT NULL,      -- advocate phone stats per dept
  wins        text,
  blockers    text,
  focus       text,
  updated_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),

  UNIQUE (type, week_date)             -- one entry per type per week (upsert target)
);

-- Allow public read and write (no auth required)
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON checkins FOR SELECT
  USING (true);

CREATE POLICY "Public insert"
  ON checkins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update"
  ON checkins FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index for fast ordered queries
CREATE INDEX IF NOT EXISTS checkins_type_date ON checkins (type, week_date ASC);
