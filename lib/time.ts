// Time-zone helpers. Client-safe (no server imports).
//
// The event form sends wall-clock times like "2026-11-20T18:00" plus the
// organizer's IANA time zone ("Asia/Dubai"). The server runs in UTC, so
// `new Date("2026-11-20T18:00")` there would read 6 PM as 6 PM *UTC* —
// four hours off for Dubai. These helpers do the conversion explicitly.

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

// Offset (ms) of `timeZone` from UTC at the given instant.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// "2026-11-20T18:00" in "Asia/Dubai" → Date for 2026-11-20T14:00Z.
// Returns null for malformed input. Strings that already carry an offset
// or "Z" are parsed as-is.
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  if (typeof local !== "string") return null;
  const m = LOCAL_RE.exec(local.trim());
  if (!m) {
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(local)) {
      const d = new Date(local);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  const [, y, mo, d, h, mi, s] = m.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  // Two passes handle DST boundaries: the offset at the guessed instant
  // may differ from the offset at the real instant.
  let utc = guess - tzOffsetMs(new Date(guess), timeZone);
  utc = guess - tzOffsetMs(new Date(utc), timeZone);
  const out = new Date(utc);
  return Number.isNaN(out.getTime()) ? null : out;
}

// Inverse: a UTC instant → "YYYY-MM-DDTHH:mm" wall-clock in `timeZone`,
// for pre-filling the date picker on the edit page.
export function utcToZonedLocal(iso: string | Date, timeZone: string): string {
  const instant = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// Formats an instant in the event's own time zone. Always pass the
// event's zone when rendering on the server — omitting it makes the
// server (UTC) and the browser (local) produce different text, which is
// what caused the React hydration errors (#418/#423/#425).
export function formatInZone(
  iso: string | Date,
  timeZone: string | null | undefined,
  opts: Intl.DateTimeFormatOptions
): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Date(iso).toLocaleString("en-US", { ...opts, timeZone: tz });
}

// An event "ends" at ends_at, or 3 hours after it starts if no end was set.
export function eventEndsAt(e: { starts_at: string; ends_at: string | null }): Date {
  return e.ends_at
    ? new Date(e.ends_at)
    : new Date(new Date(e.starts_at).getTime() + 3 * 60 * 60 * 1000);
}
