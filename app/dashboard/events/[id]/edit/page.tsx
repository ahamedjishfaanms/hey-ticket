import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getManageableEvent } from "@/lib/access";
import { utcToZonedLocal, isValidTimeZone } from "@/lib/time";
import EventForm from "@/components/EventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  const event = await getManageableEvent(params.id, userId);
  if (!event) notFound();

  // Show times in the event's own zone, exactly as the organizer entered them.
  const tz = isValidTimeZone(event.timezone) ? event.timezone : "UTC";

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/dashboard/events/${event.id}`} className="text-sm text-ink/50 hover:text-ink">
        ← Back to event
      </Link>
      <h1 className="mt-2 font-display text-3xl italic">Edit event</h1>
      <p className="mt-1 text-sm text-ink/60">
        Changes go live on the event page as soon as you save. People already
        registered keep their tickets.
      </p>
      <EventForm
        mode="edit"
        eventId={event.id}
        initial={{
          title: event.title,
          description: event.description || "",
          location: (event.is_online ? event.meeting_url : event.location) || "",
          isOnline: event.is_online,
          startsAt: utcToZonedLocal(event.starts_at, tz),
          endsAt: event.ends_at ? utcToZonedLocal(event.ends_at, tz) : "",
          capacity: event.capacity != null ? String(event.capacity) : "",
          coverImageUrl: event.cover_image_url || "",
          requireApproval: event.require_approval,
          customFields: event.custom_fields || [],
          timezone: tz,
        }}
      />
    </div>
  );
}
