import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import { validateEventInput } from "@/lib/validation";

// Toggle publish state. Organizer or co-host.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const existing = await getManageableEvent(params.id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  if (typeof body.is_published !== "boolean") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (body.is_published && existing.moderation_status === "suspended") {
    return NextResponse.json(
      { error: "This event was suspended by the HeyTicket team and can't be published." },
      { status: 403 }
    );
  }

  const [event] = await sql`
    update events
    set is_published = ${body.is_published}
    where id = ${params.id}
    returning *
  `;

  return NextResponse.json({ event });
}

// Edit the core event details (title, time, place, capacity, approval
// mode, cover). Organizer or co-host.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const existing = await getManageableEvent(params.id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // An event that has already started can still have its details fixed.
  const alreadyStarted = new Date(existing.starts_at).getTime() < Date.now();
  const checked = validateEventInput(body, { allowPastStart: alreadyStarted });
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  const v = checked.value;

  // Switching to "requires approval" doesn't touch people already
  // confirmed; switching it off doesn't auto-confirm pending requests —
  // the host still decides those from the dashboard.
  const [event] = await sql`
    update events set
      title = ${v.title},
      description = ${v.description},
      location = ${v.location},
      is_online = ${v.isOnline},
      meeting_url = ${v.meetingUrl},
      starts_at = ${v.startsAt.toISOString()},
      ends_at = ${v.endsAt ? v.endsAt.toISOString() : null},
      timezone = ${v.timezone},
      capacity = ${v.capacity},
      cover_image_url = ${v.coverImageUrl},
      require_approval = ${v.requireApproval}
    where id = ${params.id}
    returning *
  `;

  return NextResponse.json({ event });
}

// Permanently delete an event and (via ON DELETE CASCADE) its
// registrations, co-host invites and reports. Organizer only — a co-host
// shouldn't be able to delete someone else's event.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const existing = await getManageableEvent(params.id, userId);
  if (!existing || existing.role !== "organizer") {
    return NextResponse.json(
      { error: "Only the event's organizer can delete it" },
      { status: 403 }
    );
  }

  await sql`delete from events where id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
