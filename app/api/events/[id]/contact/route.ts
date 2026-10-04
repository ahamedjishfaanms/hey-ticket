import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendContactOrganizerEmail } from "@/lib/email";
import type { EventRow } from "@/lib/types";

// Public "Contact organizer" form. Relays the message by email so the
// organizer's address is never shown on the public page.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 3000) : "";

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 2) {
    return NextResponse.json(
      { error: "Please add your name, a valid email and a message." },
      { status: 400 }
    );
  }

  const [event] = (await sql`
    select * from events
    where id = ${params.id} and is_published = true and moderation_status = 'active'
  `) as EventRow[];
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [organizer] = await sql`select email from profiles where id = ${event.organizer_id}`;
  if (!organizer?.email) {
    return NextResponse.json({ error: "Organizer can't be reached right now." }, { status: 404 });
  }

  try {
    await sendContactOrganizerEmail(event, organizer.email, { name, email, message });
  } catch (err) {
    console.error("Failed to send contact email", err);
    return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
