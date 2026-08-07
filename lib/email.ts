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

function baseTemplate(opts: { heading: string; body: string; ticketUrl: string }) {
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background:#FBF7EF;">
    <div style="font-size:13px; letter-spacing: 2px; text-transform: uppercase; color:#C96A05; font-weight:700; margin-bottom:8px;">Hey Ticket</div>
    <h1 style="font-size:22px; color:#14151A; margin:0 0 16px;">${opts.heading}</h1>
    <p style="font-size:15px; line-height:1.6; color:#33343A;">${opts.body}</p>
    <a href="${opts.ticketUrl}" style="display:inline-block; margin-top:20px; background:#14151A; color:#FBF7EF; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:600; font-size:14px;">View my ticket</a>
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
      ticketUrl,
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
      ticketUrl,
    }),
  });
}
