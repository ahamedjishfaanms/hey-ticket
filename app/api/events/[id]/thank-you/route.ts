import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import { sendThankYouEmail } from "@/lib/email";
import type { EventRow, RegistrationRow } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// A registration only gets a working certificate link if it's actually
// eligible right now — sending the link to someone who isn't eligible
// yet just produces a dead "not available" page when they click it.
function isCertificateEligible(event: EventRow, reg: RegistrationRow) {
  if (event.certificate_mode === "off") return false;
  if (!event.signer1_name || !event.signer1_signature_url) return false;
  if (event.certificate_mode === "attendance") return !!reg.checked_in_at;
  return reg.status === "confirmed" || reg.status === "waitlisted";
}

// Bulk-sends post-event email. Audience is either every confirmed/
// waitlisted registration, or only people who were actually checked in
// at the door. Skips anyone already sent one, so re-running this is safe
// (e.g. after new check-ins trickle in). What actually goes in the email
// — the thank-you message, the gallery link, the certificate link — is
// independently toggleable, so a host can send a "your certificate is
// ready" email on its own, separately from a general thank-you blast, or
// combine them into one.
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

  // Default every toggle on, so existing callers (before this toggle UI
  // existed) keep their old behavior.
  const sendMessage = body.sendMessage !== false;
  const sendGallery = body.sendGallery !== false;
  const sendCertificate = body.sendCertificate !== false;

  const requireCheckedIn = audience === "checked_in_only";

  const registrations = (await sql`
    select * from registrations
    where event_id = ${params.id}
      and status in ('confirmed', 'waitlisted')
      and thank_you_sent_at is null
      and (${requireCheckedIn} = false or checked_in_at is not null)
  `) as RegistrationRow[];

  let sent = 0;
  let skippedNoContent = 0;
  const failures: string[] = [];

  for (const reg of registrations) {
    const certificateUrl =
      sendCertificate && isCertificateEligible(event, reg)
        ? `${APP_URL}/certificate/${reg.id}`
        : null;
    const emailMessage = sendMessage ? message : null;
    const emailGalleryUrl = sendGallery ? galleryUrl : null;

    // Nothing to say — skip rather than send a blank "thanks" email with
    // no content and no link.
    if (!emailMessage && !emailGalleryUrl && !certificateUrl) {
      skippedNoContent++;
      continue;
    }

    try {
      await sendThankYouEmail(event, reg, {
        galleryUrl: emailGalleryUrl,
        message: emailMessage,
        certificateUrl,
      });
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

  return NextResponse.json({
    sent,
    failed: failures.length,
    skippedNoContent,
    total: registrations.length,
  });
}
