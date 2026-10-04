import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Organizer or co-host may toggle publish state.
  const existing = await getManageableEvent(params.id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  const body = await request.json();

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
