-- =========================================================
-- HeyTicket migration 002: approval-based tickets + co-hosts
-- Run this in the Neon SQL Editor AFTER db/schema.sql.
-- Safe to run once; uses IF NOT EXISTS / guards throughout.
-- =========================================================

-- Allow a registration to sit as "pending" when an event requires
-- host approval, before becoming "confirmed" or being rejected.
do $$ begin
  alter type registration_status add value if not exists 'pending';
exception
  when duplicate_object then null;
end $$;

-- Who approved/rejected a pending registration, and when.
alter table registrations add column if not exists reviewed_at timestamptz;
alter table registrations add column if not exists reviewed_by text references profiles(id);

-- ---------- CO-HOSTS ----------
-- Lets an organizer invite another person (by email) to help manage an
-- event: see registrations, check people in, approve pending requests.
-- A co-host is matched by email the first time they sign in with Clerk,
-- since we only know their email when invited, not their Clerk user id.
create table if not exists event_collaborators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  email text not null,
  invited_by text not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

create index if not exists event_collaborators_event_idx on event_collaborators(event_id);
create index if not exists event_collaborators_email_idx on event_collaborators(email);
