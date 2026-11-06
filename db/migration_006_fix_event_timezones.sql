-- Fixes event times saved before the time-zone bug fix.
--
-- The bug: the create form sent a wall-clock time like "2026-11-20T18:00"
-- (6 PM in the organizer's zone), and the server — which runs in UTC —
-- stored it as 18:00 UTC. For an organizer in Asia/Dubai (UTC+4) every
-- event therefore shows 4 hours late on the public page, tickets,
-- calendar links and reminders.
--
-- The fix: re-read each stored instant as the wall-clock time it was
-- meant to be, in the event's own time zone.
--   (starts_at AT TIME ZONE 'UTC')        -> the wall-clock "18:00"
--   (... ) AT TIME ZONE events.timezone   -> 18:00 in Asia/Dubai = 14:00 UTC
--
-- RUN THIS EXACTLY ONCE, and only for events created BEFORE the fix was
-- deployed. Events created after the deploy are already correct and must
-- not be shifted again. Replace the timestamp below with the moment the
-- fix went live (in UTC) before running.
--
-- Recommended: take a Neon branch/snapshot first, then run the SELECT
-- preview, check a few rows, and only then run the UPDATE.

-- 1) Preview what will change.
select
  id,
  title,
  timezone,
  starts_at                                          as starts_at_before,
  (starts_at at time zone 'UTC') at time zone timezone as starts_at_after,
  ends_at                                            as ends_at_before,
  case when ends_at is null then null
       else (ends_at at time zone 'UTC') at time zone timezone end as ends_at_after
from events
where created_at < timestamptz '2026-11-07 00:00:00+00'   -- <-- deploy time (UTC)
  and timezone is not null
  and timezone <> 'UTC'
order by created_at;

-- 2) Apply it.
begin;

update events
set
  starts_at = (starts_at at time zone 'UTC') at time zone timezone,
  ends_at = case
    when ends_at is null then null
    else (ends_at at time zone 'UTC') at time zone timezone
  end
where created_at < timestamptz '2026-11-07 00:00:00+00'   -- <-- same deploy time
  and timezone is not null
  and timezone <> 'UTC';

-- Reminders are scheduled off starts_at; anything already reminded keeps
-- its reminder_sent_at, so nobody gets a second reminder.

commit;
