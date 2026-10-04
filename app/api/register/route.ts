import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateTicketCode } from "@/lib/tickets";
import {
  sendConfirmationEmail,
  sendPendingReceivedEmail,
  sendHostNewPendingEmail,
} from "@/lib/email";
import type { EventRow } from "@/lib/types";

export async function POST(request: Request) {
  const { eventId, fullName, email, customFieldResponses } = await request.json();

  if (!eventId || !fullName || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [event] = (await sql`
    select * from events where id = ${eventId} and is_published = true
  `) as EventRow[];

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Server-side guard to match the client-side check — a required
  // question left blank shouldn't be possible to submit even if someone
  // bypasses the form.
  const responses: Record<string, unknown> =
    customFieldResponses && typeof customFieldResponses === "object" ? customFieldResponses : {};
  for (const f of event.custom_fields || []) {
    if (!f.required) continue;
    const v = responses[f.id];
    const missing = f.type === "checkbox" ? !v : v === undefined || v === null || v === "";
    if (missing) {
      return NextResponse.json({ error: `"${f.label}" is required` }, { status: 400 });
    }
  }

  const [{ count: confirmedCount }] = (await sql`
    select count(*)::int as count from registrations
    where event_id = ${eventId} and status = 'confirmed'
  `) as { count: number }[];

  const isFull = event.capacity != null && confirmedCount >= event.capacity;

  // Three possible outcomes: pending host approval, waitlisted (event is
  // full), or confirmed outright — in that priority order.
  const status = event.require_approval ? "pending" : isFull ? "waitlisted" : "confirmed";

  let registration;
  try {
    [registration] = await sql`
      insert into registrations (event_id, full_name, email, status, ticket_code, custom_field_responses)
      values (
        ${eventId}, ${fullName}, ${email.toLowerCase().trim()},
        ${status}, ${generateTicketCode()}, ${JSON.stringify(responses)}
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
    if (status === "pending") {
      await sendPendingReceivedEmail(event, registration as any);

      // Notify the organizer and every co-host that a decision is waiting.
      const [organizer] = await sql`
        select email from profiles where id = ${event.organizer_id}
      `;
      const cohosts = await sql`
        select email from event_collaborators where event_id = ${eventId}
      `;
      const hostEmails = [organizer?.email, ...cohosts.map((c: any) => c.email)].filter(
        Boolean
      ) as string[];

      for (const hostEmail of hostEmails) {
        await sendHostNewPendingEmail(event, registration as any, hostEmail);
      }
    } else {
      await sendConfirmationEmail(event, registration as any);
    }

    await sql`
      update registrations set confirmation_sent_at = now() where id = ${registration.id}
    `;
  } catch (err) {
    // Don't fail the registration if the email provider has a hiccup —
    // the record still exists and is viewable at /ticket/[id].
    console.error("Failed to send registration email", err);
  }

  return NextResponse.json({
    status,
    waitlisted: status === "waitlisted",
    pending: status === "pending",
    ticketId: registration.id,
  });
}
