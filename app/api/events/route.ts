import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { ensureProfile } from "@/lib/profile";
import { sanitizeCustomFields } from "@/lib/customFields";
import { validateEventInput } from "@/lib/validation";

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  // Titles with no Latin letters (Arabic, emoji…) would otherwise give a
  // slug like "-w37m".
  return `${base || "event"}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  await ensureProfile();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const checked = validateEventInput(body);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  const v = checked.value;

  const slug = slugify(v.title);
  const cleanCustomFields = sanitizeCustomFields(body.customFields);

  try {
    const [event] = await sql`
      insert into events (
        organizer_id, slug, title, description, location, is_online, meeting_url,
        starts_at, ends_at, timezone, capacity, cover_image_url, require_approval,
        custom_fields
      ) values (
        ${userId}, ${slug}, ${v.title}, ${v.description},
        ${v.location}, ${v.isOnline}, ${v.meetingUrl},
        ${v.startsAt.toISOString()},
        ${v.endsAt ? v.endsAt.toISOString() : null},
        ${v.timezone},
        ${v.capacity},
        ${v.coverImageUrl},
        ${v.requireApproval},
        ${JSON.stringify(cleanCustomFields)}
      )
      returning *
    `;
    return NextResponse.json({ event });
  } catch (err) {
    console.error("Failed to create event", err);
    return NextResponse.json({ error: "Could not create the event — please try again" }, { status: 500 });
  }
}
