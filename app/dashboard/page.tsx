import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import type { EventRow } from "@/lib/types";
import DashboardTabs from "@/components/DashboardTabs";
import { eventEndsAt, formatInZone } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const { userId } = await auth();
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();

  // Events you own, plus events you've been added to as a co-host.
  const rows = (await sql`
    select distinct e.* from events e
    left join event_collaborators c on c.event_id = e.id
    where e.organizer_id = ${userId}
       or c.email = ${email || ""}
    order by e.starts_at asc
  `) as EventRow[];

  // An event stays "upcoming" until it has ended, not just started.
  const now = new Date();
  const upcoming = rows.filter((e) => eventEndsAt(e) >= now);
  // Most recent first — that's the one you're most likely looking for.
  const past = rows.filter((e) => eventEndsAt(e) < now).reverse();

  return (
    <div>
      <DashboardTabs active="hosting" />
      <h1 className="font-display text-3xl italic">Your events</h1>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 space-y-10">
          {upcoming.length > 0 && <EventGroup title="Upcoming" events={upcoming} />}
          {past.length > 0 && <EventGroup title="Past" events={past} muted />}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-ink/20 px-8 py-16 text-center">
      <p className="font-display text-xl">Nothing on the calendar yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">
        Create your first event, publish the page, and start collecting
        registrations in minutes.
      </p>
      <Link href="/dashboard/events/new" className="btn-primary mt-6 inline-block">
        Create an event
      </Link>
    </div>
  );
}

function EventGroup({
  title,
  events,
  muted,
}: {
  title: string;
  events: EventRow[];
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
        {title}
      </h2>
      <div className="space-y-3">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/dashboard/events/${e.id}`}
            className={`focus-ring flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-5 py-4 transition-colors hover:border-stub-400 ${
              muted ? "opacity-60" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-display text-lg">{e.title}</p>
              <p className="text-sm text-ink/50">
                {formatInZone(e.starts_at, e.timezone, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
                {e.is_online ? " · Online" : e.location ? ` · ${e.location}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                e.moderation_status === "suspended"
                  ? "bg-rose/10 text-rose"
                  : muted
                  ? "bg-ink/5 text-ink/50"
                  : e.is_published
                  ? "bg-cord/10 text-cord"
                  : "bg-ink/5 text-ink/50"
              }`}
            >
              {e.moderation_status === "suspended"
                ? "Suspended"
                : muted
                ? "Ended"
                : e.is_published
                ? "Published"
                : "Draft"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
