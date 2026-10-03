import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import { sendThankYouEmail } from "@/lib/email";
import type { RegistrationRow } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Bulk-sends the post-event thank-you email. Audience is either every
// confirmed/waitlisted registration, or only people who were actually
// checked in at the door. Skips anyone already sent one, so re-running
// this is safe (e.g. after new check-ins trickle in).
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

  const body = await request.json().catch(() => ({}));
  const audience: "all_confirmed" | "checked_in_only" =
    body.audience === "checked_in_only" ? "checked_in_only" : "all_confirmed";
  const galleryUrl: string | null = body.galleryUrl?.trim() || event.gallery_url || null;
  const message: string | null = body.message?.trim() || event.thank_you_message || null;

  const requireCheckedIn = audience === "checked_in_only";

  const registrations = (await sql`
    select * from registrations
    where event_id = ${params.id}
      and status in ('confirmed', 'waitlisted')
      and thank_you_sent_at is null
      and (${requireCheckedIn} = false or checked_in_at is not null)
  `) as RegistrationRow[];

  let sent = 0;
  const failures: string[] = [];

  for (const reg of registrations) {
    const certificateUrl =
      event.certificate_mode !== "off" ? `${APP_URL}/certificate/${reg.id}` : null;

    try {
      await sendThankYouEmail(event, reg, { galleryUrl, message, certificateUrl });
      await sql`update registrations set thank_you_sent_at = now() where id = ${reg.id}`;
      sent++;
    } catch (err) {
      console.error("Failed to send thank-you email to", reg.email, err);
      failures.push(reg.email);
    }
  }

  // Persist the gallery link / message on the event for next time, if
  // the host typed new ones in this request.
  if (body.galleryUrl !== undefined || body.message !== undefined) {
    await sql`
      update events set
        gallery_url = ${galleryUrl},
        thank_you_message = ${message}
      where id = ${params.id}
    `;
  }

  return NextResponse.json({ sent, failed: failures.length, total: registrations.length });
}
