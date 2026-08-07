"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventRow, RegistrationRow } from "@/lib/types";

export default function EventManageClient({
  event,
  initialRegistrations,
}: {
  event: EventRow;
  initialRegistrations: RegistrationRow[];
}) {
  const [isPublished, setIsPublished] = useState(event.is_published);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const eventUrl = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`,
    [event.slug]
  );

  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const waitlisted = registrations.filter((r) => r.status === "waitlisted");
  const checkedIn = registrations.filter((r) => r.checked_in_at);

  async function togglePublish() {
    setBusy(true);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !isPublished }),
    });
    setBusy(false);
    if (res.ok) setIsPublished(!isPublished);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportCsv() {
    const header = "Name,Email,Status,Checked in,Ticket code\n";
    const rows = registrations
      .map((r) =>
        [
          r.full_name,
          r.email,
          r.status,
          r.checked_in_at ? "yes" : "no",
          r.ticket_code,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
            {new Date(event.starts_at).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <h1 className="font-display text-3xl italic">{event.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/events/${event.id}/checkin`}
            className="btn-secondary"
          >
            Open scanner
          </Link>
          <button onClick={togglePublish} disabled={busy} className="btn-primary">
            {isPublished ? "Unpublish" : "Publish event"}
          </button>
        </div>
      </div>

      {isPublished && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-cord/10 px-4 py-3">
          <code className="flex-1 truncate font-mono text-sm text-cord">{eventUrl}</code>
          <button onClick={copyLink} className="text-sm font-semibold text-cord">
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4">
        <Stat label="Confirmed" value={confirmed.length} />
        <Stat label="Waitlisted" value={waitlisted.length} />
        <Stat label="Checked in" value={checkedIn.length} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl">Attendees</h2>
        {registrations.length > 0 && (
          <button onClick={exportCsv} className="text-sm font-semibold text-stub-600">
            Export CSV
          </button>
        )}
      </div>

      {registrations.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">
          No registrations yet. Share your event link to start collecting them.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/5 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Checked in</th>
                <th className="px-4 py-3">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-t border-ink/5">
                  <td className="px-4 py-3">{r.full_name}</td>
                  <td className="px-4 py-3 text-ink/60">{r.email}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3">
                    {r.checked_in_at ? (
                      <span className="text-cord">
                        {new Date(r.checked_in_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.ticket_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white px-5 py-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
