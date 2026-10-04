import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import { sanitizeCustomFields } from "@/lib/customFields";

// Saves the registration form's extra questions for an existing event.
// Co-hosts may manage this too, same as the rest of the event-manage
// surface.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const event = await getManageableEvent(params.id, userId);
  if (!event) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const cleanCustomFields = sanitizeCustomFields(body.customFields);

  const [updated] = await sql`
    update events set custom_fields = ${JSON.stringify(cleanCustomFields)}
    where id = ${params.id}
    returning *
  `;

  return NextResponse.json({ event: updated });
}
