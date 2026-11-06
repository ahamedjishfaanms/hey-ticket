import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateTicketCode } from "@/lib/tickets";
import {
  sendConfirmationEmail,
  sendPendingReceivedEmail,
  sendHostNewPendingEmail,
} from "@/lib/email";
import type { EventRow } from "@/lib/types";
import { LIMITS, isEmail } from "@/lib/validation";
import { eventEndsAt } from "@/lib/time";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { eventId, customFieldResponses } = body || {};
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!eventId || !fullName || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (fullName.length > LIMITS.name) {
    return NextResponse.json({ error: `Name must be ${LIMITS.name} characters or fewer` }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const [event] = (await sql`
    select * from events
    where id = ${eventId} and is_published = true and moderation_status = 'active'
  `) as EventRow[];

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (eventEndsAt(event) < new Date()) {
    return NextResponse.json({ error: "This event has already ended" }, { status: 400 });
  }

  // Only keep answers to questions this event actually asks, and check
  // each one: required questions answered, multiple-choice answers one of
  // the listed options, text within a sane length. A hand-made request
  // shouldn't be able to slip past what the form enforces.
  const raw: Record<string, unknown> =
    customFieldResponses && typeof customFieldResponses === "object" ? customFieldResponses : {};
  const responses: Record<string, string | boolean> = {};
  for (const f of event.custom_fields || []) {
    const v = raw[f.id];
    if (f.type === "checkbox") {
      if (f.required && v !== true) {
        return NextResponse.json({ error: `"${f.label}" is required` }, { status: 400 });
      }
      if (v === true) responses[f.id] = true;
      continue;
    }
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) {
      if (f.required) {
        return NextResponse.json({ error: `"${f.label}" is required` }, { status: 400 });
      }
      continue;
    }
    if (f.type === "select" && !(f.options || []).includes(s)) {
      return NextResponse.json({ error: `Pick one of the options for "${f.label}"` }, { status: 400 });
    }
    if (s.length > LIMITS.answer) {
      return NextResponse.json({ error: `Answer to "${f.label}" is too long` }, { status: 400 });
    }
    responses[f.id] = s;
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
        ${eventId}, ${fullName}, ${email},
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
