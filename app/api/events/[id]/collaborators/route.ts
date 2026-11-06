import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { sendCohostInviteEmail } from "@/lib/email";
import type { EventRow } from "@/lib/types";
import { isEmail } from "@/lib/validation";

// Only the original organizer can add/remove co-hosts — a co-host
// shouldn't be able to invite further co-hosts or remove the owner.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const [event] = (await sql`
    select * from events where id = ${params.id} and organizer_id = ${userId}
  `) as EventRow[];

  if (!event) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const normalizedEmail = email;

  const [owner] = await sql`select email from profiles where id = ${userId}`;
  if (owner?.email && String(owner.email).toLowerCase() === normalizedEmail) {
    return NextResponse.json({ error: "That's you — you already own this event" }, { status: 400 });
  }

  let collaborator;
  try {
    [collaborator] = await sql`
      insert into event_collaborators (event_id, email, invited_by)
      values (${params.id}, ${normalizedEmail}, ${userId})
      returning *
    `;
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Already a co-host" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not add co-host" }, { status: 500 });
  }

  try {
    await sendCohostInviteEmail(event, normalizedEmail);
  } catch (err) {
    console.error("Failed to send co-host invite email", err);
  }

  return NextResponse.json({ collaborator });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { collaboratorId } = await request.json();

  const [event] = (await sql`
    select * from events where id = ${params.id} and organizer_id = ${userId}
  `) as EventRow[];

  if (!event) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await sql`
    delete from event_collaborators where id = ${collaboratorId} and event_id = ${params.id}
  `;

  return NextResponse.json({ ok: true });
}
