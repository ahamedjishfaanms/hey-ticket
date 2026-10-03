"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventCollaboratorRow, EventRow, RegistrationRow } from "@/lib/types";

export default function EventManageClient({
  event,
  role,
  initialRegistrations,
  initialCollaborators,
}: {
  event: EventRow;
  role: "organizer" | "cohost";
  initialRegistrations: RegistrationRow[];
  initialCollaborators: EventCollaboratorRow[];
}) {
  const [isPublished, setIsPublished] = useState(event.is_published);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cohostEmail, setCohostEmail] = useState("");
  const [cohostBusy, setCohostBusy] = useState(false);
  const [cohostError, setCohostError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const eventUrl = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`,
    [event.slug]
  );

  const pending = registrations.filter((r) => r.status === "pending");
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

  async function decide(registrationId: string, decision: "approve" | "reject") {
    setDecidingId(registrationId);
    const res = await fetch(`/api/registrations/${registrationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setDecidingId(null);
    if (res.ok) {
      const { registration } = await res.json();
      setRegistrations((prev) => prev.map((r) => (r.id === registration.id ? registration : r)));
    }
  }

  async function addCohost(e: React.FormEvent) {
    e.preventDefault();
    setCohostBusy(true);
    setCohostError(null);
    const res = await fetch(`/api/events/${event.id}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cohostEmail }),
    });
    const data = await res.json();
    setCohostBusy(false);
    if (!res.ok) {
      setCohostError(data.error || "Could not add co-host");
      return;
    }
    setCollaborators((prev) => [...prev, data.collaborator]);
    setCohostEmail("");
  }

  async function removeCohost(collaboratorId: string) {
    await fetch(`/api/events/${event.id}/collaborators`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId }),
    });
    setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
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
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="mb-6 h-40 w-full rounded-xl object-cover"
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
            {new Date(event.starts_at).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            {role === "cohost" && " · You're a co-host"}
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

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Pending" value={pending.length} />
        <Stat label="Confirmed" value={confirmed.length} />
        <Stat label="Waitlisted" value={waitlisted.length} />
        <Stat label="Checked in" value={checkedIn.length} />
      </div>

      {pending.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl">Needs your approval</h2>
          <div className="mt-4 space-y-2">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-stub-400/40 bg-stub-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{r.full_name}</p>
                  <p className="text-xs text-ink/50">{r.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(r.id, "reject")}
                    disabled={decidingId === r.id}
                    className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:border-rose hover:text-rose"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => decide(r.id, "approve")}
                    disabled={decidingId === r.id}
                    className="rounded-full bg-cord px-3 py-1.5 text-xs font-semibold text-paper hover:bg-cord/80"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {role === "organizer" && (
        <div className="mt-10">
          <h2 className="font-display text-xl">Co-hosts</h2>
          <p className="mt-1 text-sm text-ink/50">
            Add someone by email to let them manage this event — see
            registrations, approve requests, and check people in.
          </p>

          {collaborators.length > 0 && (
            <div className="mt-4 space-y-2">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-2.5"
                >
                  <span className="text-sm">{c.email}</span>
                  <button
                    onClick={() => removeCohost(c.id)}
                    className="text-xs font-semibold text-ink/40 hover:text-rose"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addCohost} className="mt-4 flex gap-2">
            <input
              type="email"
              required
              value={cohostEmail}
              onChange={(e) => setCohostEmail(e.target.value)}
              placeholder="cohost@example.com"
              className="input flex-1"
            />
            <button disabled={cohostBusy} className="btn-secondary">
              {cohostBusy ? "Adding…" : "Add co-host"}
            </button>
          </form>
          {cohostError && <p className="mt-2 text-sm text-rose">{cohostError}</p>}
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
