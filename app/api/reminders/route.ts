import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";
import type { EventRow, RegistrationRow } from "@/lib/types";

// Called on a schedule (see vercel.json) roughly every hour. For each
// published, upcoming event, finds registrations that haven't had a
// reminder yet and are now within the event's configured reminder window.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const events = (await sql`
    select * from events where is_published = true and starts_at > ${now.toISOString()}
  `) as EventRow[];

  let sent = 0;

  for (const event of events) {
    const reminderThreshold = new Date(
      new Date(event.starts_at).getTime() - event.reminder_hours_before * 60 * 60 * 1000
    );

    if (now < reminderThreshold) continue; // too early for this event

    const registrations = (await sql`
      select * from registrations
      where event_id = ${event.id} and status = 'confirmed' and reminder_sent_at is null
    `) as RegistrationRow[];

    for (const reg of registrations) {
      try {
        await sendReminderEmail(event, reg);
        await sql`
          update registrations set reminder_sent_at = now() where id = ${reg.id}
        `;
        sent += 1;
      } catch (err) {
        console.error(`Failed reminder for registration ${reg.id}`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, remindersSent: sent });
}
