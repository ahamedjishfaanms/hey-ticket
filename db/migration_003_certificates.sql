-- =========================================================
-- HeyTicket migration 003: logo, ticket branding, certificates,
-- signatures, post-event thank-you emails
-- Run this in the Neon SQL Editor AFTER migration_002.
-- Safe to run once; uses IF NOT EXISTS throughout.
-- =========================================================

-- ---------- EVENT BRANDING ----------
-- A small logo shown on the ticket (separate from the wide cover image).
alter table events add column if not exists logo_url text;

-- Certificates: 'off' | 'participation' (anyone confirmed) |
-- 'attendance' (must have been checked in at the door).
alter table events add column if not exists certificate_mode text not null default 'off';

-- Two authorized signatures on the certificate. Signer 2 is optional.
alter table events add column if not exists signer1_name text;
alter table events add column if not exists signer1_title text;
alter table events add column if not exists signer1_signature_url text;
alter table events add column if not exists signer2_name text;
alter table events add column if not exists signer2_title text;
alter table events add column if not exists signer2_signature_url text;

-- ---------- POST-EVENT ----------
alter table events add column if not exists gallery_url text;
alter table events add column if not exists thank_you_message text;

-- Tracks whether a given registration has already received the
-- post-event thank-you email, so the dashboard can show progress.
alter table registrations add column if not exists thank_you_sent_at timestamptz;
