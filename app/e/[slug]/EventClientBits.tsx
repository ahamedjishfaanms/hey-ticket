"use client";

import { useEffect, useRef, useState } from "react";
import { getDict, type Lang } from "@/lib/eventPageI18n";
import { REPORT_REASONS } from "@/lib/moderation";
import {
  googleCalendarUrl,
  icsDataUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const localeOf = (_lang: Lang) => "en-US";

function formatWhen(iso: string, lang: Lang, timeZone?: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(localeOf(lang), {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
  const time = d.toLocaleTimeString(localeOf(lang), {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  return { date, time };
}

/* ---------------- Date & time in the visitor's timezone ---------------- */

// Server renders in the event's timezone (so there's no flash of wrong
// content for local visitors); after mount we switch to the visitor's own
// timezone and, if it differs, also show the event's local time.
export function LocalDateTime({
  startsAt,
  endsAt,
  eventTz,
  lang,
}: {
  startsAt: string;
  endsAt: string | null;
  eventTz: string;
  lang: Lang;
}) {
  const t = getDict(lang);
  const [visitorTz, setVisitorTz] = useState<string | null>(null);

  useEffect(() => {
    try {
      setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      /* keep event tz */
    }
  }, []);

  const tz = visitorTz || eventTz;
  const start = formatWhen(startsAt, lang, tz);
  const endTime = endsAt
    ? new Date(endsAt).toLocaleTimeString(localeOf(lang), {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
      })
    : null;
  const differs = visitorTz && visitorTz !== eventTz;
  const tzName = new Date(startsAt)
    .toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "short" })
    .split(" ")
    .pop();

  return (
    <div>
      <p className="font-semibold">{start.date}</p>
      <p className="text-sm text-ink/60 dark:text-paper/60">
        {start.time}
        {endTime ? ` – ${endTime}` : ""} · {tzName}
        {differs ? ` (${t.yourTime})` : ""}
      </p>
      {differs && (
        <p className="mt-0.5 text-xs text-ink/40 dark:text-paper/40">
          {t.eventTime}: {formatWhen(startsAt, lang, eventTz).time} · {eventTz.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}

/* ---------------- Countdown pill ---------------- */

export function Countdown({
  startsAt,
  endsAt,
  lang,
}: {
  startsAt: string;
  endsAt: string | null;
  lang: Lang;
}) {
  const t = getDict(lang);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (now == null) return null;
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 3 * 60 * 60 * 1000;
  if (now > end) return null;

  let label: string;
  if (now >= start) {
    label = t.happeningNow;
  } else {
    const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: "auto" });
    const mins = Math.round((start - now) / 60_000);
    label =
      mins < 60
        ? rtf.format(mins, "minute")
        : mins < 60 * 24
        ? rtf.format(Math.round(mins / 60), "hour")
        : rtf.format(Math.round(mins / (60 * 24)), "day");
    label = `${t.startsIn} ${label}`;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stub-100 px-3 py-1 text-xs font-semibold text-stub-600 dark:bg-stub-500/15 dark:text-stub-400">
      <span
        className={`h-1.5 w-1.5 rounded-full bg-stub-500 ${now >= start ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}

/* ---------------- Read more ---------------- */

export function ReadMore({ text, lang }: { text: string; lang: Lang }) {
  const t = getDict(lang);
  const [open, setOpen] = useState(false);
  const long = text.length > 420 || text.split("\n").length > 8;

  return (
    <div>
      <p
        dir="auto"
        className={`whitespace-pre-wrap leading-relaxed text-ink/75 dark:text-paper/75 ${
          long && !open ? "line-clamp-6" : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 text-sm font-semibold text-stub-600 hover:underline dark:text-stub-400"
        >
          {open ? t.showLess : t.readMore}
        </button>
      )}
    </div>
  );
}

/* ---------------- Sticky mobile CTA ---------------- */

// Fixed bottom bar on phones. Hides itself while the registration card is
// on screen so there's never two competing buttons.
export function StickyCta({
  label,
  priceLabel,
  subLabel,
  disabled,
}: {
  label: string;
  priceLabel: string;
  subLabel?: string;
  disabled?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("register");
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-200 dark:border-white/10 dark:bg-[#101116]/95 md:hidden ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">{priceLabel}</p>
          {subLabel && (
            <p className="truncate text-xs text-ink/50 dark:text-paper/50">{subLabel}</p>
          )}
        </div>
        {disabled ? (
          <span className="rounded-full bg-ink/10 px-6 py-3 text-sm font-semibold text-ink/50 dark:bg-white/10 dark:text-paper/50">
            {label}
          </span>
        ) : (
          <a
            href="#register"
            className="rounded-full bg-stub-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-stub-500/30 active:scale-[0.98]"
          >
            {label}
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------------- Share ---------------- */

export function ShareButtons({
  url,
  title,
  lang,
  compact,
}: {
  url: string;
  title: string;
  lang: Lang;
  compact?: boolean;
}) {
  const t = getDict(lang);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const text = `${title} — ${url}`;
  const links = [
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(text)}`, icon: <WhatsAppIcon /> },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <LinkedInIcon />,
    },
    {
      name: "X",
      href: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      icon: <XIcon />,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.share}: ${l.name}`}
          title={l.name}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition-colors hover:border-ink/40 hover:text-ink dark:border-white/15 dark:text-paper/70 dark:hover:text-paper"
        >
          {l.icon}
        </a>
      ))}
      <button
        onClick={copy}
        className="focus-ring flex h-10 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink/70 hover:border-ink/40 hover:text-ink dark:border-white/15 dark:text-paper/70"
      >
        <LinkIcon />
        {copied ? t.copied : t.copyLink}
      </button>
      {canNative && (
        <button
          onClick={() => navigator.share({ title, url }).catch(() => {})}
          className="focus-ring flex h-10 items-center rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink/70 hover:border-ink/40 dark:border-white/15 dark:text-paper/70"
        >
          {t.share}…
        </button>
      )}
    </div>
  );
}

/* ---------------- Add to calendar ---------------- */

export function CalendarButtons({ event, lang }: { event: CalendarEvent; lang: Lang }) {
  const t = getDict(lang);
  const btn =
    "focus-ring flex-1 rounded-lg border border-ink/15 px-3 py-2 text-center text-xs font-semibold text-ink/80 hover:border-ink/40 dark:border-white/15 dark:text-paper/80";
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/40">
        {t.addToCalendar}
      </p>
      <div className="flex gap-2">
        <a className={btn} href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
          Google
        </a>
        <a className={btn} href={icsDataUrl(event)} download="event.ics">
          Apple
        </a>
        <a className={btn} href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
          Outlook
        </a>
      </div>
    </div>
  );
}

/* ---------------- Contact organizer ---------------- */

export function ContactOrganizer({ eventId, lang }: { eventId: string; lang: Lang }) {
  const t = getDict(lang);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const res = await fetch(`/api/events/${eventId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        {t.contactOrganizer}
      </button>
    );
  }

  if (state === "sent") {
    return <p className="text-sm text-cord">{t.messageSent}</p>;
  }

  return (
    <form onSubmit={submit} className="w-full space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fullName} className="input" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email} className="input" />
      </div>
      <textarea
        required
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t.yourMessage}
        className="input"
        dir="auto"
      />
      {error && <p className="text-sm text-rose">{error}</p>}
      <div className="flex gap-2">
        <button disabled={state === "sending"} className="btn-primary">
          {state === "sending" ? t.sending : t.send}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Report event ---------------- */

export function ReportEvent({ eventId, lang }: { eventId: string; lang: Lang }) {
  const t = getDict(lang);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const ref = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setState("sending");
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, reason, details, email }),
    }).catch(() => {});
    setState("sent");
  }

  if (state === "sent") {
    return <p className="text-xs text-ink/50 dark:text-paper/50">{t.reportThanks}</p>;
  }

  return (
    <div ref={ref}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-ink/40 underline-offset-2 hover:text-rose hover:underline dark:text-paper/40"
        >
          🚩 {t.reportEvent}
        </button>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-2 rounded-xl border border-ink/10 bg-white p-4 text-start dark:border-white/10 dark:bg-[#1a1c23]"
        >
          <p className="text-sm font-semibold">{t.reportReason}</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  reason === r
                    ? "border-rose bg-rose/10 text-rose"
                    : "border-ink/15 text-ink/60 dark:border-white/15 dark:text-paper/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t.reportDetails}
            className="input"
            dir="auto"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.yourEmailOptional}
            className="input"
          />
          <div className="flex gap-2">
            <button
              disabled={!reason || state === "sending"}
              className="focus-ring rounded-full bg-rose px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {state === "sending" ? t.sending : t.send}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              {t.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ---------------- Icons ---------------- */

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3v-11zm7 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v6.45h-4v-5.72c0-1.36-.02-3.12-1.9-3.12-1.9 0-2.2 1.48-2.2 3.02v5.82h-4v-11z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}
