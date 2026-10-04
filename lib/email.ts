import { Resend } from "resend";
import type { EventRow, RegistrationRow } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "HeyTicket <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function formatWhen(event: EventRow) {
  const d = new Date(event.starts_at);
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
    timeZoneName: "short",
  });
}

function baseTemplate(opts: {
  heading: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  // Rendered ticket card HTML (see ticketCardHtml below), shown between
  // the body text and the CTA button.
  ticketCard?: string;
}) {
  const cta = opts.ctaUrl
    ? `<a href="${opts.ctaUrl}" style="display:inline-block; margin-top:20px; background:#14151A; color:#FBF7EF; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:600; font-size:14px;">${opts.ctaLabel || "View"}</a>`
    : "";

  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background:#FBF7EF;">
    <div style="font-size:13px; letter-spacing: 2px; text-transform: uppercase; color:#C96A05; font-weight:700; margin-bottom:8px;">Hey Ticket</div>
    <h1 style="font-size:22px; color:#14151A; margin:0 0 16px;">${opts.heading}</h1>
    <p style="font-size:15px; line-height:1.6; color:#33343A;">${opts.body}</p>
    ${opts.ticketCard || ""}
    ${cta}
    <p style="font-size:12px; color:#8A8B90; margin-top:32px;">Sent by HeyTicket on behalf of the event organizer.</p>
  </div>`;
}

// Renders the actual ticket — cover image banner, event details, QR code
// — as an HTML block to embed directly in the email. The QR is loaded
// from a public image URL (not a data: URI), since Gmail and other
// clients strip inline data URIs from emails.
function ticketCardHtml(event: EventRow, reg: RegistrationRow) {
  const qrUrl = `${APP_URL}/api/tickets/${reg.id}/qr`;
  const cover = event.cover_image_url
    ? `<img src="${event.cover_image_url}" alt="" width="432" style="display:block; width:100%; max-width:432px; height:140px; object-fit:cover; border-radius:12px 12px 0 0;" />`
    : "";

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; max-width:432px; border:1px solid #E7E0D0; border-radius:12px; overflow:hidden; background:#ffffff;">
    <tr><td style="padding:0;">${cover}</td></tr>
    <tr>
      <td style="padding:20px 20px 0;">
        <p style="margin:0; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:#C96A05; font-weight:700;">Admit one</p>
        <p style="margin:4px 0 0; font-size:19px; font-weight:700; color:#14151A;">${event.title}</p>
        <p style="margin:4px 0 0; font-size:13px; color:#6B6C72;">${formatWhen(event)}</p>
        ${event.location ? `<p style="margin:2px 0 0; font-size:13px; color:#6B6C72;">${event.location}</p>` : ""}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
          <tr>
            <td style="text-align:center; padding:12px; background:#ffffff;">
              <img src="${qrUrl}" alt="QR ticket code ${reg.ticket_code}" width="160" height="160" style="display:inline-block; border:1px solid #F0EBDD; border-radius:8px;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 20px 20px; border-top:1px dashed #E7E0D0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
          <tr>
            <td style="font-size:11px; color:#8A8B90;">Ticket holder<br/><span style="font-size:14px; color:#14151A; font-weight:600;">${reg.full_name}</span></td>
            <td style="font-size:11px; color:#8A8B90; text-align:right;">Code<br/><span style="font-size:13px; color:#14151A; font-family:monospace;">${reg.ticket_code}</span></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export async function sendConfirmationEmail(event: EventRow, reg: RegistrationRow) {
  const ticketUrl = `${APP_URL}/ticket/${reg.id}`;

  if (reg.status === "waitlisted") {
    return resend.emails.send({
      from: FROM,
      to: reg.email,
      subject: `You're on the waitlist for ${event.title}`,
      html: baseTemplate({
        heading: "You're on the waitlist",
        body: `Hi ${reg.full_name.split(" ")[0]}, you're on the waitlist for <strong>${event.title}</strong> — we'll email you if a spot opens up.`,
        ctaUrl: ticketUrl,
        ctaLabel: "View status",
      }),
    });
  }

  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject: `Your ticket for ${event.title}`,
    html: baseTemplate({
      heading: "You're going! 🎟️",
      body: `Hi ${reg.full_name.split(" ")[0]}, you're in — here's your ticket for <strong>${event.title}</strong>.`,
      ticketCard: ticketCardHtml(event, reg),
      ctaUrl: ticketUrl,
      ctaLabel: "Open full ticket",
    }),
  });
}

// Sent to the registrant when the event requires host approval — no
// ticket yet, just confirmation their request was received.
export async function sendPendingReceivedEmail(event: EventRow, reg: RegistrationRow) {
  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject: `Request received for ${event.title}`,
    html: baseTemplate({
      heading: "Your request is in 👀",
      body: `Hi ${reg.full_name.split(" ")[0]}, your registration for <strong>${event.title}</strong> (${formatWhen(event)}) needs the host's approval. We'll email you the moment it's confirmed.`,
    }),
  });
}

// Sent to the organizer (and any co-hosts) when a new pending
// registration needs a decision.
export async function sendHostNewPendingEmail(
  event: EventRow,
  reg: RegistrationRow,
  hostEmail: string
) {
  const manageUrl = `${APP_URL}/dashboard/events/${event.id}`;
  return resend.emails.send({
    from: FROM,
    to: hostEmail,
    subject: `New registration request for ${event.title}`,
    html: baseTemplate({
      heading: "Someone wants in",
      body: `${reg.full_name} (${reg.email}) just registered for <strong>${event.title}</strong> and is waiting on your approval.`,
      ctaUrl: manageUrl,
      ctaLabel: "Review request",
    }),
  });
}

// Sent when a host approves a pending registration — this is the moment
// the ticket actually goes out.
export async function sendApprovedEmail(event: EventRow, reg: RegistrationRow) {
  const ticketUrl = `${APP_URL}/ticket/${reg.id}`;
  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject: `You're approved for ${event.title}`,
    html: baseTemplate({
      heading: "You're in! 🎟️",
      body: `Hi ${reg.full_name.split(" ")[0]}, the host approved your request for <strong>${event.title}</strong>. Here's your ticket.`,
      ticketCard: ticketCardHtml(event, reg),
      ctaUrl: ticketUrl,
      ctaLabel: "Open full ticket",
    }),
  });
}

// Sent when a host declines a pending registration.
export async function sendRejectedEmail(event: EventRow, reg: RegistrationRow) {
  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject: `Update on your request for ${event.title}`,
    html: baseTemplate({
      heading: "Request declined",
      body: `Hi ${reg.full_name.split(" ")[0]}, unfortunately the host wasn't able to approve your request for <strong>${event.title}</strong> this time.`,
    }),
  });
}

export async function sendReminderEmail(event: EventRow, reg: RegistrationRow) {
  const ticketUrl = `${APP_URL}/ticket/${reg.id}`;
  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject: `Reminder: ${event.title} is coming up`,
    html: baseTemplate({
      heading: "See you soon 👋",
      body: `Hi ${reg.full_name.split(" ")[0]}, just a reminder that <strong>${event.title}</strong> starts ${formatWhen(event)}${event.location ? ` at ${event.location}` : ""}. Bring this ticket for fast check-in.`,
      ticketCard: ticketCardHtml(event, reg),
      ctaUrl: ticketUrl,
      ctaLabel: "Open full ticket",
    }),
  });
}

// Sent after the event is over — optional gallery link and/or a link to
// the attendee's certificate, if the host turned certificates on.
export async function sendThankYouEmail(
  event: EventRow,
  reg: RegistrationRow,
  opts: { galleryUrl?: string | null; message?: string | null; certificateUrl?: string | null }
) {
  const extras = [
    opts.message
      ? `<p style="margin:16px 0 0; font-size:15px; line-height:1.6; color:#33343A;">${opts.message}</p>`
      : "",
    opts.galleryUrl
      ? `<p style="margin:16px 0 0;"><a href="${opts.galleryUrl}" style="color:#C96A05; font-weight:600; text-decoration:none;">View event photos →</a></p>`
      : "",
  ].join("");

  // When this email carries nothing but a certificate link (no thank-you
  // message, no gallery), lead with the certificate rather than a generic
  // "thanks" — this is what a standalone "your certificate is ready"
  // send looks like.
  const certificateOnly = !!opts.certificateUrl && !opts.message && !opts.galleryUrl;

  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject: certificateOnly
      ? `Your certificate for ${event.title} is ready`
      : `Thank you for joining ${event.title}`,
    html: baseTemplate({
      heading: certificateOnly ? "Your certificate is ready 🎓" : "Thanks for being there 🎉",
      body: certificateOnly
        ? `Hi ${reg.full_name.split(" ")[0]}, your certificate for <strong>${event.title}</strong> is ready to view and download.`
        : `Hi ${reg.full_name.split(" ")[0]}, thank you for joining <strong>${event.title}</strong> — it wouldn't have been the same without you.`,
      ticketCard: extras || undefined,
      ctaUrl: opts.certificateUrl || undefined,
      ctaLabel: opts.certificateUrl ? "View your certificate" : undefined,
    }),
  });
}

// Sent to an invited co-host so they know they now help manage an event.
export async function sendCohostInviteEmail(event: EventRow, cohostEmail: string) {
  const manageUrl = `${APP_URL}/dashboard/events/${event.id}`;
  return resend.emails.send({
    from: FROM,
    to: cohostEmail,
    subject: `You've been added as a co-host for ${event.title}`,
    html: baseTemplate({
      heading: "You're co-hosting 🤝",
      body: `You've been added as a co-host for <strong>${event.title}</strong> (${formatWhen(event)}). Sign in to Hey Ticket with this email address to manage registrations and check people in.`,
      ctaUrl: manageUrl,
      ctaLabel: "Open event dashboard",
    }),
  });
}
