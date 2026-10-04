-- =========================================================
-- HeyTicket migration 004: custom registration form fields
-- (the watermark certificate background needs no schema change —
-- it's generated from data that already exists)
-- Run this in the Neon SQL Editor AFTER migration_003.
-- Safe to run once; uses IF NOT EXISTS throughout.
-- =========================================================

-- Host-defined extra questions on the registration form, Google-Forms
-- style. Stored as a JSON array of
-- { id, label, type: 'text'|'textarea'|'select'|'checkbox', required, options? }
alter table events add column if not exists custom_fields jsonb not null default '[]';

-- The attendee's answers, keyed by the field's id.
alter table registrations add column if not exists custom_field_responses jsonb not null default '{}';
