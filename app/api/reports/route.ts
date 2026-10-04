import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendAdminReportEmail } from "@/lib/email";
import { REPORT_REASONS, adminEmailList } from "@/lib/moderation";
import type { EventRow } from "@/lib/types";

// Public: anyone viewing an event page can flag it for admin review.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const reason = typeof body?.reason === "string" ? body.reason : "";
  const details = typeof body?.details === "string" ? body.details.trim().slice(0, 2000) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUuid || !(REPORT_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: "Please choose a reason" }, { status: 400 });
  }

  const [event] = (await sql`select * from events where id = ${eventId}`) as EventRow[];
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Light abuse guard: cap open reports per event so the table can't be flooded.
  const [{ count }] = (await sql`
    select count(*)::int as count from event_reports
    where event_id = ${eventId} and created_at > now() - interval '1 hour'
  `) as { count: number }[];
  if (count >= 50) {
    return NextResponse.json({ ok: true });
  }

  await sql`
    insert into event_reports (event_id, reason, details, reporter_email)
    values (${eventId}, ${reason}, ${details || null}, ${email || null})
  `;

  // Only email admins on the first open report, so a pile-on doesn't spam.
  if (count === 0) {
    for (const admin of adminEmailList()) {
      try {
        await sendAdminReportEmail(event, admin, reason, details || null);
      } catch (err) {
        console.error("Failed to email admin about report", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
