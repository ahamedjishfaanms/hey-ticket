import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import { sendApprovedEmail, sendRejectedEmail } from "@/lib/email";
import type { EventRow } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { decision } = await request.json();
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be approve or reject" }, { status: 400 });
  }

  const [registration] = await sql`
    select * from registrations where id = ${params.id}
  `;

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  // Organizer or co-host of the event this registration belongs to.
  const event = (await getManageableEvent(registration.event_id, userId)) as EventRow | null;
  if (!event) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (registration.status !== "pending") {
    return NextResponse.json(
      { error: "This request has already been reviewed" },
      { status: 409 }
    );
  }

  const newStatus = decision === "approve" ? "confirmed" : "cancelled";

  const [updated] = await sql`
    update registrations
    set status = ${newStatus}, reviewed_at = now(), reviewed_by = ${userId}
    where id = ${params.id}
    returning *
  `;

  try {
    if (decision === "approve") {
      await sendApprovedEmail(event, updated as any);
    } else {
      await sendRejectedEmail(event, updated as any);
    }
  } catch (err) {
    console.error("Failed to send decision email", err);
  }

  return NextResponse.json({ registration: updated });
}
