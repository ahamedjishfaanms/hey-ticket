// Server-side input checks. The browser form has its own checks, but
// anything reaching the API can be sent by hand, so the API must not
// trust it.

import { isValidTimeZone, zonedLocalToUtc } from "./time";

export const LIMITS = {
  title: 150,
  description: 5000,
  location: 300,
  url: 500,
  capacityMax: 100_000,
  name: 120,
  email: 254,
  answer: 2000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= LIMITS.email && EMAIL_RE.test(v.trim());
}

// Only https links may be stored for anything that ends up in an href or
// src (meeting link, gallery, logo, signatures). Blocks javascript:,
// data:, and plain http.
export function isHttpsUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length > LIMITS.url) return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && Boolean(u.hostname);
  } catch {
    return false;
  }
}

// Empty → null; valid https → trimmed string; anything else → error.
export function optionalHttpsUrl(
  v: unknown,
  label: string
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v == null || (typeof v === "string" && v.trim() === "")) return { ok: true, value: null };
  if (!isHttpsUrl(v)) return { ok: false, error: `${label} must be a link starting with https://` };
  return { ok: true, value: (v as string).trim() };
}

export interface EventInput {
  title: string;
  description: string | null;
  location: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  capacity: number | null;
  coverImageUrl: string | null;
  requireApproval: boolean;
}

// Validates the core event fields sent by the create/edit form.
// `allowPastStart` lets the edit endpoint save an event that has already
// started (e.g. fixing a typo in a past event's title).
export function validateEventInput(
  body: any,
  { allowPastStart = false }: { allowPastStart?: boolean } = {}
): { ok: true; value: EventInput } | { ok: false; error: string } {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return { ok: false, error: "Add an event title" };
  if (title.length > LIMITS.title)
    return { ok: false, error: `Title must be ${LIMITS.title} characters or fewer` };

  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  if (description && description.length > LIMITS.description)
    return { ok: false, error: `Description must be ${LIMITS.description} characters or fewer` };

  const timezone = isValidTimeZone(body?.timezone) ? body.timezone : "UTC";

  if (!body?.startsAt) return { ok: false, error: "Pick a start date and time" };
  const startsAt = zonedLocalToUtc(String(body.startsAt), timezone);
  if (!startsAt) return { ok: false, error: "Start time isn't a valid date" };
  // 10-minute grace so "today, now-ish" isn't rejected by clock skew.
  if (!allowPastStart && startsAt.getTime() < Date.now() - 10 * 60 * 1000)
    return { ok: false, error: "Start time is in the past" };

  let endsAt: Date | null = null;
  if (body?.endsAt) {
    endsAt = zonedLocalToUtc(String(body.endsAt), timezone);
    if (!endsAt) return { ok: false, error: "End time isn't a valid date" };
    if (endsAt.getTime() <= startsAt.getTime())
      return { ok: false, error: "End time must be after the start time" };
  }

  const isOnline = Boolean(body?.isOnline);
  const rawLocation = typeof body?.location === "string" ? body.location.trim() : "";
  let location: string | null = null;
  let meetingUrl: string | null = null;
  if (isOnline) {
    if (rawLocation) {
      if (!isHttpsUrl(rawLocation))
        return { ok: false, error: "Meeting link must start with https://" };
      meetingUrl = rawLocation;
    }
  } else {
    if (!rawLocation) return { ok: false, error: "Add a location, or switch to online" };
    if (rawLocation.length > LIMITS.location)
      return { ok: false, error: `Location must be ${LIMITS.location} characters or fewer` };
    location = rawLocation;
  }

  let capacity: number | null = null;
  const rawCap = body?.capacity;
  if (rawCap !== undefined && rawCap !== null && String(rawCap).trim() !== "") {
    const n = Number(rawCap);
    if (!Number.isInteger(n) || n < 1 || n > LIMITS.capacityMax)
      return {
        ok: false,
        error: `Capacity must be a whole number between 1 and ${LIMITS.capacityMax.toLocaleString("en-US")}`,
      };
    capacity = n;
  }

  const cover = optionalHttpsUrl(body?.coverImageUrl, "Cover image");
  if (!cover.ok) return cover;

  return {
    ok: true,
    value: {
      title,
      description,
      location,
      isOnline,
      meetingUrl,
      startsAt,
      endsAt,
      timezone,
      capacity,
      coverImageUrl: cover.value,
      requireApproval: Boolean(body?.requireApproval),
    },
  };
}

// Prefixes values that spreadsheet apps would execute as formulas
// (= + - @, tab, carriage return) so an attendee named
// =HYPERLINK(...) shows up as text instead of running.
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
