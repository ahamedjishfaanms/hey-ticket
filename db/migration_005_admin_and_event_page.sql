-- =========================================================
-- HeyTicket migration 005: platform admin moderation + richer
-- public event page (agenda, speakers, FAQ, venue notes)
-- Run this in the Neon SQL Editor AFTER migration_004.
-- Safe to run once; uses IF NOT EXISTS throughout.
-- =========================================================

-- ---------- MODERATION ----------
-- 'active'    -> normal; visible when published
-- 'suspended' -> hidden from the public and closed to registration by a
--                platform admin (e.g. illegal or unsafe event). The
--                organizer can't re-publish it until an admin restores it.
alter table events add column if not exists moderation_status text not null default 'active';
alter table events add column if not exists moderation_note text;
alter table events add column if not exists moderated_at timestamptz;
alter table events add column if not exists moderated_by text;

create index if not exists events_moderation_idx on events(moderation_status);

-- Reports from the public "Report this event" link.
create table if not exists event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  reason text not null,
  details text,
  reporter_email text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now()
);

create index if not exists event_reports_event_idx on event_reports(event_id);
create index if not exists event_reports_open_idx on event_reports(event_id) where resolved_at is null;

-- ---------- EVENT PAGE DETAILS ----------
-- agenda:   [{ id, time, title }]
-- speakers: [{ id, name, role, photo_url }]
-- faqs:     [{ id, question, answer }]
alter table events add column if not exists agenda jsonb not null default '[]';
alter table events add column if not exists speakers jsonb not null default '[]';
alter table events add column if not exists faqs jsonb not null default '[]';
-- Directions, parking, entrance notes shown under the map.
alter table events add column if not exists venue_notes text;
