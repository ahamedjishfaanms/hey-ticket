"use client";

import { useMemo, useState } from "react";

export interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  created_at: string;
}

export interface AdminEventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_online: boolean;
  meeting_url: string | null;
  starts_at: string;
  timezone: string;
  capacity: number | null;
  is_published: boolean;
  moderation_status: "active" | "suspended";
  moderation_note: string | null;
  moderated_at: string | null;
  created_at: string;
  organizer_name: string | null;
  organizer_email: string | null;
  confirmed_count: number;
  registration_count: number;
  open_reports: AdminReport[];
}

type Filter = "all" | "reported" | "live" | "upcoming" | "suspended" | "drafts";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reported", label: "Reported" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "suspended", label: "Suspended" },
  { value: "drafts", label: "Drafts" },
];

export default function AdminClient({
  initialEvents,
  totalUsers,
  initialFilter,
}: {
  initialEvents: AdminEventRow[];
  totalUsers: number;
  initialFilter?: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState<Filter>(
    FILTERS.some((f) => f.value === initialFilter) ? (initialFilter as Filter) : "all"
  );
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const now = Date.now();
  const isLive = (e: AdminEventRow) => e.is_published && e.moderation_status === "active";

  const counts = {
    total: events.length,
    live: events.filter(isLive).length,
    reported: events.filter((e) => e.open_reports.length > 0).length,
    suspended: events.filter((e) => e.moderation_status === "suspended").length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => {
        switch (filter) {
          case "reported":
            return e.open_reports.length > 0;
          case "live":
            return isLive(e);
          case "upcoming":
            return isLive(e) && new Date(e.starts_at).getTime() >= now;
          case "suspended":
            return e.moderation_status === "suspended";
          case "drafts":
            return !e.is_published && e.moderation_status === "active";
          default:
            return true;
        }
      })
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          (e.organizer_email || "").toLowerCase().includes(q) ||
          (e.organizer_name || "").toLowerCase().includes(q) ||
          (e.location || "").toLowerCase().includes(q)
      )
      .sort((a, b) => b.open_reports.length - a.open_reports.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filter, query]);

  function patchLocal(id: string, patch: Partial<AdminEventRow>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Events" value={counts.total} />
        <Stat label="Live now" value={counts.live} />
        <Stat label="Reported" value={counts.reported} tone={counts.reported ? "rose" : undefined} />
        <Stat label="Suspended" value={counts.suspended} />
        <Stat label="Organizers" value={totalUsers} />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                filter === f.value
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/15 text-ink/60 hover:border-ink/30"
              }`}
            >
              {f.label}
              {f.value === "reported" && counts.reported > 0 && (
                <span className="ms-1.5 rounded-full bg-rose px-1.5 text-[11px] text-white">
                  {counts.reported}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, organizer, location…"
          className="input sm:max-w-xs"
        />
      </div>

      <div className="mt-6 space-y-3">
        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/50">
            Nothing here.
          </p>
        )}
        {visible.map((e) => (
          <AdminEventCard
            key={e.id}
            event={e}
            open={openId === e.id}
            onToggle={() => setOpenId(openId === e.id ? null : e.id)}
            onChange={(patch) => patchLocal(e.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function AdminEventCard({
  event: e,
  open,
  onToggle,
  onChange,
}: {
  event: AdminEventRow;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<AdminEventRow>) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suspended = e.moderation_status === "suspended";

  async function act(action: "suspend" | "restore" | "resolve_reports") {
    if (action === "suspend" && !note.trim()) {
      setError("Add a short reason — it's emailed to the organizer.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
    if (action === "suspend") {
      onChange({ moderation_status: "suspended", moderation_note: note.trim(), open_reports: [] });
      setNote("");
    } else if (action === "restore") {
      onChange({ moderation_status: "active", moderation_note: null });
    } else {
      onChange({ open_reports: [] });
    }
  }

  const when = new Date(e.starts_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: e.timezone,
    timeZoneName: "short",
  });

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white ${
        e.open_reports.length ? "border-rose/40" : "border-ink/10"
      }`}
    >
      <button
        onClick={onToggle}
        className="focus-ring flex w-full items-center gap-4 px-5 py-4 text-start"
      >
        {e.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover_image_url} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="h-12 w-16 shrink-0 rounded-md bg-stub-100" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg" dir="auto">
            {e.title}
          </p>
          <p className="truncate text-xs text-ink/50">
            {when} · {e.organizer_name || "Unknown"} ({e.organizer_email || "no email"}) ·{" "}
            {e.registration_count} registrations
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {e.open_reports.length > 0 && (
            <Badge tone="rose">🚩 {e.open_reports.length}</Badge>
          )}
          {suspended ? (
            <Badge tone="rose">Suspended</Badge>
          ) : e.is_published ? (
            <Badge tone="cord">Live</Badge>
          ) : (
            <Badge>Draft</Badge>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-ink/10 px-5 py-5">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Where">
              {e.is_online ? `Online${e.meeting_url ? ` · ${e.meeting_url}` : ""}` : e.location || "—"}
            </Row>
            <Row label="Capacity">
              {e.confirmed_count} confirmed{e.capacity ? ` / ${e.capacity}` : ""}
            </Row>
            <Row label="Created">{new Date(e.created_at).toLocaleString()}</Row>
            <Row label="Public link">
              <a
                href={`/e/${e.slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-stub-600 hover:underline"
              >
                /e/{e.slug} ↗
              </a>
            </Row>
          </dl>

          {e.description && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-ink/40">Description</p>
              <p
                className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm text-ink/80"
                dir="auto"
              >
                {e.description}
              </p>
            </div>
          )}

          {e.open_reports.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-rose">Open reports</p>
              <ul className="mt-2 space-y-2">
                {e.open_reports.map((r) => (
                  <li key={r.id} className="rounded-lg bg-rose/5 px-3 py-2 text-sm">
                    <span className="font-semibold">{r.reason}</span>
                    <span className="text-ink/40">
                      {" "}
                      · {new Date(r.created_at).toLocaleString()}
                      {r.reporter_email ? ` · ${r.reporter_email}` : ""}
                    </span>
                    {r.details && (
                      <p className="mt-1 whitespace-pre-wrap text-ink/70" dir="auto">
                        {r.details}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suspended && e.moderation_note && (
            <p className="mt-4 rounded-lg bg-rose/5 px-3 py-2 text-sm">
              <span className="font-semibold text-rose">Suspended:</span> {e.moderation_note}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {!suspended && (
              <textarea
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                rows={2}
                placeholder="Reason for suspending (sent to the organizer)…"
                className="input"
              />
            )}
            <div className="flex flex-wrap gap-2">
              {suspended ? (
                <button onClick={() => act("restore")} disabled={busy} className="btn-primary">
                  Restore event
                </button>
              ) : (
                <button
                  onClick={() => act("suspend")}
                  disabled={busy}
                  className="focus-ring rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose/85 disabled:opacity-50"
                >
                  Suspend event
                </button>
              )}
              {e.open_reports.length > 0 && !suspended && (
                <button onClick={() => act("resolve_reports")} disabled={busy} className="btn-secondary">
                  Dismiss reports (looks fine)
                </button>
              )}
              {e.organizer_email && (
                <a href={`mailto:${e.organizer_email}`} className="btn-secondary">
                  Email organizer
                </a>
              )}
            </div>
            {error && <p className="text-sm text-rose">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "rose" }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white px-4 py-3">
      <p className={`font-display text-2xl ${tone === "rose" ? "text-rose" : ""}`}>{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "rose" | "cord" }) {
  const cls =
    tone === "rose"
      ? "bg-rose/10 text-rose"
      : tone === "cord"
      ? "bg-cord/10 text-cord"
      : "bg-ink/5 text-ink/50";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-ink/40">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
