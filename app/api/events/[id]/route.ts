import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();

  if (typeof body.is_published !== "boolean") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [event] = await sql`
    update events
    set is_published = ${body.is_published}
    where id = ${params.id} and organizer_id = ${userId}
    returning *
  `;

  if (!event) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
