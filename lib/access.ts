import { currentUser } from "@clerk/nextjs/server";
import { sql } from "./db";
import type { EventRow } from "./types";

// Returns the event if the signed-in user may manage it — either because
// they're the organizer, or because their account email matches an
// event_collaborators invite for this event. Returns null otherwise
// (not found, or found but not authorized), so callers can 404 either way
// without leaking whether the event exists.
export async function getManageableEvent(
  eventId: string,
  userId: string | null | undefined
): Promise<(EventRow & { role: "organizer" | "cohost" }) | null> {
  if (!userId) return null;

  const [event] = (await sql`
    select * from events where id = ${eventId}
  `) as EventRow[];

  if (!event) return null;

  if (event.organizer_id === userId) {
    return { ...event, role: "organizer" };
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return null;

  const [collab] = await sql`
    select 1 from event_collaborators
    where event_id = ${eventId} and email = ${email}
  `;

  if (collab) {
    return { ...event, role: "cohost" };
  }

  return null;
}
