import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  const { eventId, ticketCode } = await request.json();

  if (!eventId || !ticketCode) {
    return NextResponse.json({ error: "Missing eventId or ticketCode" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Only the organizer who owns this event can check tickets in.
  const [event] = await sql`
    select id from events where id = ${eventId} and organizer_id = ${userId}
  `;

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
