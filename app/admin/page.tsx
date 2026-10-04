import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getAdminUserId } from "@/lib/admin";
import AdminClient, { type AdminEventRow } from "./AdminClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Hey Ticket" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  // Non-admins get a plain 404 so the page's existence isn't revealed.
  const adminId = await getAdminUserId();
  if (!adminId) notFound();

  const events = (await sql`
    select
      e.id, e.slug, e.title, e.description, e.cover_image_url, e.location,
      e.is_online, e.meeting_url, e.starts_at, e.timezone, e.capacity,
      e.is_published, e.moderation_status, e.moderation_note, e.moderated_at,
      e.created_at,
      p.full_name as organizer_name, p.email as organizer_email,
      (select count(*)::int from registrations r
         where r.event_id = e.id and r.status = 'confirmed') as confirmed_count,
      (select count(*)::int from registrations r where r.event_id = e.id) as registration_count,
      coalesce((
        select json_agg(json_build_object(
          'id', x.id, 'reason', x.reason, 'details', x.details,
          'reporter_email', x.reporter_email, 'created_at', x.created_at
        ) order by x.created_at desc)
        from event_reports x
        where x.event_id = e.id and x.resolved_at is null
      ), '[]'::json) as open_reports
    from events e
    left join profiles p on p.id = e.organizer_id
    order by e.created_at desc
    limit 1000
  `) as AdminEventRow[];

  const [{ users }] = (await sql`select count(*)::int as users from profiles`) as {
    users: number;
  }[];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-display text-lg font-semibold">
            Hey<span className="text-stub-500">Ticket</span>
          </Link>
          <span className="rounded-full bg-rose/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose">
            Admin
          </span>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-ink/60 hover:text-ink">
          ← Back to dashboard
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <h1 className="font-display text-3xl italic">Event moderation</h1>
        <p className="mt-1 text-sm text-ink/50">
          Every event on HeyTicket, from every organizer. Suspend anything illegal or unsafe —
          it disappears from the public, registration closes, and the organizer is emailed.
        </p>
        <AdminClient
          initialEvents={events}
          totalUsers={users}
          initialFilter={searchParams.filter}
        />
      </main>
    </div>
  );
}
