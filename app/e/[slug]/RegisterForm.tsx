"use client";

import { useState } from "react";
import type { CustomFieldDef, CustomFieldResponses } from "@/lib/types";
import type { CalendarEvent } from "@/lib/calendar";
import { getDict, type Lang } from "@/lib/eventPageI18n";
import { CalendarButtons, ShareButtons } from "./EventClientBits";

// One-step registration: name + email (+ any organizer questions), no
// account required. On success the QR ticket, calendar links and share
// buttons appear right here — no extra page load.
export default function RegisterForm({
  eventId,
  isFull,
  requiresApproval,
  customFields = [],
  lang,
  calendarEvent,
  shareUrl,
  priceLabel,
}: {
  eventId: string;
  isFull: boolean;
  requiresApproval: boolean;
  customFields?: CustomFieldDef[];
  lang: Lang;
  calendarEvent: CalendarEvent;
  shareUrl: string;
  priceLabel: string;
}) {
  const t = getDict(lang);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [responses, setResponses] = useState<CustomFieldResponses>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    waitlisted: boolean;
    pending: boolean;
    ticketId: string;
  } | null>(null);

  function setResponse(id: string, value: string | boolean) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const f of customFields) {
      if (f.required) {
        const v = responses[f.id];
        if (f.type === "checkbox" ? !v : !v || (typeof v === "string" && !v.trim())) {
          setError(`"${f.label}" ${t.required}`);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, fullName, email, customFieldResponses: responses }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setDone({ waitlisted: data.waitlisted, pending: data.pending, ticketId: data.ticketId });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const ctaLabel = isFull ? t.joinWaitlist : requiresApproval ? t.requestToJoin : t.getTicket;

  if (done) {
    const title = done.pending ? t.requestSent : done.waitlisted ? t.waitlisted : t.youreIn;
    const icon = done.pending ? "👀" : done.waitlisted ? "⏳" : "🎉";

    return (
      <div className="text-center" aria-live="polite">
        <p className="text-4xl">{icon}</p>
        <p className="mt-2 font-display text-2xl">{title}</p>
        <p className="mt-1 text-sm text-ink/60 dark:text-paper/60">
          {done.pending ? t.checkEmailPending(email) : t.checkEmail(email)}
        </p>

        {!done.pending && (
          <div className="mt-5 rounded-2xl border border-dashed border-ink/20 bg-paper p-4 dark:border-white/15 dark:bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/tickets/${done.ticketId}/qr`}
              alt="QR ticket"
              width={200}
              height={200}
              className="mx-auto h-48 w-48"
            />
            <p className="mt-2 text-xs font-semibold text-ink/50">{t.showAtDoor}</p>
          </div>
        )}

        {!done.pending && (
          <a href={`/ticket/${done.ticketId}`} className="btn-primary mt-4 block w-full">
            {t.viewTicket}
          </a>
        )}

        <div className="mt-6 space-y-5 text-start">
          {!done.pending && <CalendarButtons event={calendarEvent} lang={lang} />}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/40">
              {t.shareWithFriends}
            </p>
            <ShareButtons url={shareUrl} title={calendarEvent.title} lang={lang} compact />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl">{isFull ? t.soldOut : t.reserveSpot}</p>
        <p className="font-display text-xl text-stub-600 dark:text-stub-400">{priceLabel}</p>
      </div>
      {requiresApproval && !isFull && (
        <p className="-mt-1 text-xs text-ink/50 dark:text-paper/50">{t.approvalNote}</p>
      )}

      <div>
        <label htmlFor="reg-name" className="mb-1 block text-sm font-medium">
          {t.fullName}
        </label>
        <input
          id="reg-name"
          required
          autoComplete="name"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          dir="auto"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="mb-1 block text-sm font-medium">
          {t.email}
        </label>
        <input
          id="reg-email"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          dir="ltr"
        />
      </div>

      {customFields.map((f) => (
        <div key={f.id}>
          <label className="mb-1 block text-sm font-medium" dir="auto">
            {f.label}
            {f.required && <span className="text-rose"> *</span>}
          </label>
          {f.type === "text" && (
            <input
              required={f.required}
              className="input"
              value={(responses[f.id] as string) || ""}
              onChange={(e) => setResponse(f.id, e.target.value)}
              dir="auto"
            />
          )}
          {f.type === "textarea" && (
            <textarea
              required={f.required}
              className="input min-h-20"
              value={(responses[f.id] as string) || ""}
              onChange={(e) => setResponse(f.id, e.target.value)}
              dir="auto"
            />
          )}
          {f.type === "select" && (
            <select
              required={f.required}
              className="input"
              value={(responses[f.id] as string) || ""}
              onChange={(e) => setResponse(f.id, e.target.value)}
            >
              <option value="" disabled>
                …
              </option>
              {(f.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {f.type === "checkbox" && (
            <label className="flex items-center gap-2 text-sm text-ink/70 dark:text-paper/70">
              <input
                type="checkbox"
                checked={!!responses[f.id]}
                onChange={(e) => setResponse(f.id, e.target.checked)}
              />
              ✓
            </label>
          )}
        </div>
      ))}

      {error && (
        <p className="text-sm text-rose" role="alert">
          {error}
        </p>
      )}
      <button
        disabled={loading}
        className="focus-ring w-full rounded-full bg-stub-500 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-stub-500/25 transition hover:bg-stub-600 active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? t.submitting : ctaLabel}
      </button>
      <p className="text-center text-xs text-ink/40 dark:text-paper/40">{t.noAccount}</p>
    </form>
  );
}
