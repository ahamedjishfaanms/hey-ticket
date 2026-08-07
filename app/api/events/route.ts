import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { ensureProfile } from "@/lib/profile";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  await ensureProfile();

  const body = await request.json();
  const {
    title,
    description,
    location,
    isOnline,
    startsAt,
    endsAt,
    capacity,
    timezone,
  } = body;

  if (!title || !startsAt) {
    return NextResponse.json({ error: "Title and start time are required" }, { status: 400 });
  }

  const slug = slugify(title);

  const [event] = await sql`
    insert into events (
      organizer_id, slug, title, description, location, is_online, meeting_url,
      starts_at, ends_at, timezone, capacity
    ) values (
      ${userId}, ${slug}, ${title}, ${description || null},
      ${isOnline ? null : location || null}, ${Boolean(isOnline)},
      ${isOnline ? location || null : null},
      ${new Date(startsAt).toISOString()},
      ${endsAt ? new Date(endsAt).toISOString() : null},
      ${timezone || "UTC"},
      ${capacity ? Number(capacity) : null}
    )
    returning *
  `;

  return NextResponse.json({ event });
}
