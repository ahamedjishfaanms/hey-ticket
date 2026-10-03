import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";

export async function POST(request: Request) {
  const { eventId, ticketCode } = await request.json();

  if (!eventId || !ticketCode) {
    return NextResponse.json({ error: "Missing eventId or ticketCode" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Organizer or co-host only.
  const event = await getManageableEvent(eventId, userId);
  if (!event) {
    return NextResponse.json({ error: "Not authorized for this event" }, { status: 403 });
  }

  const [registration] = await sql`
    select * from registrations
    where event_id = ${eventId} and ticket_code = ${ticketCode.toUpperCase().trim()}
  `;

  if (!registration) {
    return NextResponse.json({ error: "No ticket with that code" }, { status: 404 });
  }

  if (registration.status === "cancelled") {
    return NextResponse.json({ error: "This ticket was cancelled" }, { status: 409 });
  }

  if (registration.status === "pending") {
    return NextResponse.json(
      { error: "This request hasn't been approved yet" },
      { status: 409 }
    );
  }

  if (registration.status === "waitlisted") {
    return NextResponse.json(
      { error: "This person is on the waitlist, not confirmed" },
      { status: 409 }
    );
  }

  const alreadyCheckedIn = Boolean(registration.checked_in_at);

  if (!alreadyCheckedIn) {
    await sql`
      update registrations
      set checked_in_at = now(), checked_in_by = ${userId}
      where id = ${registration.id}
    `;
  }

  return NextResponse.json({ registration, alreadyCheckedIn });
}
