-- =========================================================
-- HeyTicket database schema (Neon + Clerk edition)
-- Run this in the Neon SQL editor, or via psql / any Postgres client
-- connected to your Neon database.
--
-- Authorization is enforced in the Next.js app (using the signed-in
-- Clerk user id), not in Postgres — Neon's free tier is plain Postgres,
-- so there's no built-in auth.uid()/RLS-per-user like Supabase provides.
-- Every query that touches another organizer's data is guarded in the
-- API routes / server components by checking organizer_id = <clerk user id>.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES (organizers) ----------
-- id is the Clerk user id (e.g. "user_2abc123..."), not a generated uuid.
create table if not exists profiles (
  id text primary key,
  email text,
  full_name text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- EVENTS ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organizer_id text not null references profiles(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  cover_image_url text,
  location text,
  is_online boolean not null default false,
  meeting_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  capacity integer,
  is_published boolean not null default false,
  require_approval boolean not null default false,
  reminder_hours_before integer not null default 24,
  created_at timestamptz not null default now()
);

create index if not exists events_organizer_idx on events(organizer_id);
create index if not exists events_slug_idx on events(slug);

-- ---------- REGISTRATIONS / TICKETS ----------
do $$ begin
  create type registration_status as enum ('confirmed', 'waitlisted', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  full_name text not null,
  email text not null,
  status registration_status not null default 'confirmed',
  ticket_code text not null unique,
  checked_in_at timestamptz,
  checked_in_by text references profiles(id),
  reminder_sent_at timestamptz,
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

create index if not exists registrations_event_idx on registrations(event_id);
create index if not exists registrations_code_idx on registrations(ticket_code);

-- ---------- VIEW: attendance summary ----------
create or replace view event_attendance_summary as
select
  e.id as event_id,
  count(r.id) filter (where r.status = 'confirmed') as confirmed_count,
  count(r.id) filter (where r.status = 'waitlisted') as waitlisted_count,
  count(r.id) filter (where r.checked_in_at is not null) as checked_in_count
from events e
left join registrations r on r.event_id = e.id
group by e.id;
