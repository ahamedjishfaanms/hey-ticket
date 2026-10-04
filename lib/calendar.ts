// "Add to calendar" links. Client-safe (no server imports).

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startsAt: string; // ISO
  endsAt?: string | null; // ISO
  url: string;
}

function end(ev: CalendarEvent) {
  // Default to a 2-hour slot when the organizer didn't set an end time.
  return ev.endsAt
    ? new Date(ev.endsAt)
    : new Date(new Date(ev.startsAt).getTime() + 2 * 60 * 60 * 1000);
}

// 20260912T150000Z
function utcStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(ev: CalendarEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${utcStamp(new Date(ev.startsAt))}/${utcStamp(end(ev))}`,
    details: `${ev.description ? ev.description.slice(0, 500) + "\n\n" : ""}${ev.url}`,
    location: ev.location || "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(ev: CalendarEvent) {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    startdt: new Date(ev.startsAt).toISOString(),
    enddt: end(ev).toISOString(),
    body: `${ev.description ? ev.description.slice(0, 500) + "\n\n" : ""}${ev.url}`,
    location: ev.location || "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

// Apple Calendar (and any desktop calendar) via a downloaded .ics file.
export function icsDataUrl(ev: CalendarEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HeyTicket//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${utcStamp(new Date(ev.startsAt))}-${encodeURIComponent(ev.url)}@heyticket`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(new Date(ev.startsAt))}`,
    `DTEND:${utcStamp(end(ev))}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `DESCRIPTION:${icsEscape(`${ev.description ? ev.description.slice(0, 500) + "\n\n" : ""}${ev.url}`)}`,
    ev.location ? `LOCATION:${icsEscape(ev.location)}` : "",
    `URL:${ev.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
