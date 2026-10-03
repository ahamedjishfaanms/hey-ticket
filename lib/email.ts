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
}) {
  const cta = opts.ctaUrl
    ? `<a href="${opts.ctaUrl}" style="display:inline-block; margin-top:20px; background:#14151A; color:#FBF7EF; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:600; font-size:14px;">${opts.ctaLabel || "View"}</a>`
    : "";

  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background:#FBF7EF;">
    <div style="font-size:13px; letter-spacing: 2px; text-transform: uppercase; color:#C96A05; font-weight:700; margin-bottom:8px;">Hey Ticket</div>
    <h1 style="font-size:22px; color:#14151A; margin:0 0 16px;">${opts.heading}</h1>
    <p style="font-size:15px; line-height:1.6; color:#33343A;">${opts.body}</p>
    ${cta}
    <p style="font-size:12px; color:#8A8B90; margin-top:32px;">Sent by HeyTicket on behalf of the event organizer.</p>
  </div>`;
}

export async function sendConfirmationEmail(event: EventRow, reg: RegistrationRow) {
  const ticketUrl = `${APP_URL}/ticket/${reg.id}`;
  const statusLine =
    reg.status === "waitlisted"
      ? "You're on the waitlist — we'll email you if a spot opens up."
      : `You're in! Here's your ticket for <strong>${event.title}</strong>, happening ${formatWhen(event)}.`;

  return resend.emails.send({
    from: FROM,
    to: reg.email,
    subject:
      reg.status === "waitlisted"
        ? `You're on the waitlist for ${event.title}`
        : `Your ticket for ${event.title}`,
    html: baseTemplate({
      heading:
        reg.status === "waitlisted" ? "You're on the waitlist" : "You're going! 🎟️",
      body: `Hi ${reg.full_name.split(" ")[0]}, ${statusLine}`,
      ctaUrl: ticketUrl,
      ctaLabel: "View my ticket",
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
      body: `Hi ${reg.full_name.split(" ")[0]}, the host approved your request for <strong>${event.title}</strong>, happening ${formatWhen(event)}. Here's your ticket.`,
      ctaUrl: ticketUrl,
      ctaLabel: "View my ticket",
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
      body: `Hi ${reg.full_name.split(" ")[0]}, just a reminder that <strong>${event.title}</strong> starts ${formatWhen(event)}${event.location ? ` at ${event.location}` : ""}. Bring your QR ticket for fast check-in.`,
      ctaUrl: ticketUrl,
      ctaLabel: "View my ticket",
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
