import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import type { EventRow } from "@/lib/types";
import RegisterForm from "./RegisterForm";

// Publish status and capacity can change after this page is first
// requested, so it must never be served from a stale cache.
export const dynamic = "force-dynamic";

export default async function PublicEventPage({
  params,
}: {
  params: { slug: string };
}) {
  const [event] = (await sql`
    select * from events where slug = ${params.slug} and is_published = true
  `) as EventRow[];

  if (!event) notFound();

  const [{ count: confirmedCount }] = (await sql`
    select count(*)::int as count from registrations
    where event_id = ${event.id} and status = 'confirmed'
  `) as { count: number }[];

  const isFull = event.capacity != null && confirmedCount >= event.capacity;

  const when = new Date(event.starts_at).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
    timeZoneName: "short",
  });

  return (
    <main className="min-h-screen bg-paper text-ink">
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="h-56 w-full object-cover md:h-72"
        />
      )}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-[3fr_2fr] md:py-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-stub-600">
            {event.is_online ? "Online event" : "In person"}
          </p>
          <h1 className="mt-3 font-display text-4xl italic leading-tight">{event.title}</h1>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink/40">When</dt>
              <dd>{when}</dd>
            </div>
            {event.location && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-ink/40">
                  {event.is_online ? "Link" : "Where"}
                </dt>
                <dd>{event.location}</dd>
              </div>
            )}
            {event.capacity && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-ink/40">Capacity</dt>
                <dd>
                  {confirmedCount} / {event.capacity} spots filled
                </dd>
              </div>
            )}
          </dl>

          {event.description && (
            <p className="mt-8 whitespace-pre-wrap text-ink/70">{event.description}</p>
          )}
        </div>

        <div className="h-fit rounded-2xl border border-ink/10 bg-white p-6">
          <RegisterForm
            eventId={event.id}
            isFull={isFull}
            requiresApproval={event.require_approval}
            customFields={event.custom_fields || []}
          />
        </div>
      </div>
    </main>
  );
}
