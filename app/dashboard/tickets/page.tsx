import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import DashboardTabs from "@/components/DashboardTabs";

interface MyTicketRow {
  registration_id: string;
  status: string;
  checked_in_at: string | null;
  event_id: string;
  title: string;
  starts_at: string;
  location: string | null;
  cover_image_url: string | null;
}

export default async function MyTicketsPage() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();

  const rows = email
    ? ((await sql`
        select
          r.id as registration_id, r.status, r.checked_in_at,
          e.id as event_id, e.title, e.starts_at, e.location, e.cover_image_url
        from registrations r
        join events e on e.id = r.event_id
        where r.email = ${email}
        order by e.starts_at asc
      `) as MyTicketRow[])
    : [];

  const upcoming = rows.filter((r) => new Date(r.starts_at) >= new Date());
  const past = rows.filter((r) => new Date(r.starts_at) < new Date());

  return (
    <div>
      <DashboardTabs active="tickets" />
      <h1 className="font-display text-3xl italic">Events you're attending</h1>
      <p className="mt-1 text-sm text-ink/60">
        Matched by your account email ({email}).
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink/20 px-8 py-16 text-center">
          <p className="font-display text-xl">No tickets yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">
            When you register for an event with this email address, your
            ticket will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {upcoming.length > 0 && <TicketGroup title="Upcoming" rows={upcoming} />}
          {past.length > 0 && <TicketGroup title="Past" rows={past} muted />}
        </div>
      )}
    </div>
  );
}

function TicketGroup({
  title,
  rows,
  muted,
}: {
  title: string;
  rows: MyTicketRow[];
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
        {title}
      </h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <Link
            key={r.registration_id}
            href={`/ticket/${r.registration_id}`}
            className={`focus-ring flex items-center gap-4 rounded-xl border border-ink/10 bg-white px-5 py-4 transition-colors hover:border-stub-400 ${
              muted ? "opacity-60" : ""
            }`}
          >
            {r.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.cover_image_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-display text-lg">{r.title}</p>
              <p className="text-sm text-ink/50">
                {new Date(r.starts_at).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {r.location ? ` · ${r.location}` : ""}
              </p>
            </div>
            <StatusPill status={r.status} checkedIn={Boolean(r.checked_in_at)} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status, checkedIn }: { status: string; checkedIn: boolean }) {
  if (checkedIn) {
    return (
      <span className="rounded-full bg-cord/10 px-3 py-1 text-xs font-semibold text-cord">
        Checked in
      </span>
    );
  }
  const styles: Record<string, string> = {
    confirmed: "bg-cord/10 text-cord",
    pending: "bg-stub-100 text-stub-600",
    waitlisted: "bg-ink/5 text-ink/50",
    cancelled: "bg-rose/10 text-rose",
  };
  const labels: Record<string, string> = {
    confirmed: "Confirmed",
    pending: "Pending",
    waitlisted: "Waitlisted",
    cancelled: "Cancelled",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}
