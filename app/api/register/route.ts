import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateTicketCode } from "@/lib/tickets";
import { sendConfirmationEmail } from "@/lib/email";
import type { EventRow } from "@/lib/types";

export async function POST(request: Request) {
  const { eventId, fullName, email } = await request.json();

  if (!eventId || !fullName || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [event] = (await sql`
    select * from events where id = ${eventId} and is_published = true
  `) as EventRow[];

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [{ count: confirmedCount }] = (await sql`
    select count(*)::int as count from registrations
    where event_id = ${eventId} and status = 'confirmed'
  `) as { count: number }[];

  const isFull = event.capacity != null && confirmedCount >= event.capacity;

  let registration;
  try {
    [registration] = await sql`
      insert into registrations (event_id, full_name, email, status, ticket_code)
      values (
        ${eventId}, ${fullName}, ${email.toLowerCase().trim()},
        ${isFull ? "waitlisted" : "confirmed"}, ${generateTicketCode()}
      )
      returning *
    `;
  } catch (err: any) {
    // Unique violation on (event_id, email) -> already registered
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "That email is already registered for this event." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not register" }, { status: 500 });
  }

  try {
    await sendConfirmationEmail(event, registration as any);
    await sql`
      update registrations set confirmation_sent_at = now() where id = ${registration.id}
    `;
  } catch (err) {
    // Don't fail the registration if the email provider has a hiccup —
    // the ticket still exists and is viewable at /ticket/[id].
    console.error("Failed to send confirmation email", err);
  }

  return NextResponse.json({
    waitlisted: isFull,
    ticketId: registration.id,
  });
}
