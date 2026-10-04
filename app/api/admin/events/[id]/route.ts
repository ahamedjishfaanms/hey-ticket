import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminUserId } from "@/lib/admin";
import { sendEventSuspendedEmail } from "@/lib/email";
import type { EventRow } from "@/lib/types";

// Platform-admin moderation actions on any event:
//   { action: "suspend", note }  -> hide + close registration, email organizer
//   { action: "restore" }        -> back to active (organizer decides publish)
//   { action: "resolve_reports" } -> mark all open reports as handled
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : "";

  const [existing] = (await sql`select * from events where id = ${params.id}`) as EventRow[];
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (action === "suspend") {
    const [event] = (await sql`
      update events
      set moderation_status = 'suspended',
          moderation_note = ${note || null},
          moderated_at = now(),
          moderated_by = ${adminId}
      where id = ${params.id}
      returning *
    `) as EventRow[];

    // Suspending usually follows a report, so close those out too.
    await sql`
      update event_reports set resolved_at = now(), resolved_by = ${adminId}
      where event_id = ${params.id} and resolved_at is null
    `;

    try {
      const [organizer] = await sql`select email from profiles where id = ${event.organizer_id}`;
      if (organizer?.email) await sendEventSuspendedEmail(event, organizer.email, note || null);
    } catch (err) {
      console.error("Failed to email organizer about suspension", err);
    }

    return NextResponse.json({ event });
  }

  if (action === "restore") {
    const [event] = await sql`
      update events
      set moderation_status = 'active',
          moderation_note = null,
          moderated_at = now(),
          moderated_by = ${adminId}
      where id = ${params.id}
      returning *
    `;
    return NextResponse.json({ event });
  }

  if (action === "resolve_reports") {
    await sql`
      update event_reports set resolved_at = now(), resolved_by = ${adminId}
      where event_id = ${params.id} and resolved_at is null
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
