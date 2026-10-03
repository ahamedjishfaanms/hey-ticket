import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { ticketQrDataUrl } from "@/lib/tickets";
import TicketCardClient from "@/components/TicketCardClient";
import type { EventRow, RegistrationRow } from "@/lib/types";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const [registration] = (await sql`
    select * from registrations where id = ${params.id}
  `) as RegistrationRow[];

  if (!registration) notFound();

  const [event] = (await sql`
    select * from events where id = ${registration.event_id}
  `) as EventRow[];

  if (!event) notFound();

  const when = new Date(event.starts_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
    timeZoneName: "short",
  });

  // Pending/cancelled registrations don't get a scannable QR yet (or
  // ever) — showing one would let someone in before the host decided.
  const showQr = registration.status === "confirmed" || registration.status === "waitlisted";
  const qr = showQr ? await ticketQrDataUrl(registration.ticket_code) : null;

  const statusLabel =
    registration.status === "pending"
      ? "Awaiting approval"
      : registration.status === "waitlisted"
      ? "Waitlisted"
      : registration.status === "cancelled"
      ? "Cancelled"
      : "Admit one";

  const certificateEligible =
    event.certificate_mode === "participation"
      ? registration.status === "confirmed" || registration.status === "waitlisted"
      : event.certificate_mode === "attendance"
      ? !!registration.checked_in_at
      : false;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <TicketCardClient
        event={{
          title: event.title,
          cover_image_url: event.cover_image_url,
          logo_url: event.logo_url,
          location: event.location,
        }}
        registration={{
          full_name: registration.full_name,
          ticket_code: registration.ticket_code,
          status: registration.status,
          checked_in_at: registration.checked_in_at,
        }}
        qr={qr}
        statusLabel={statusLabel}
        when={when}
        certificateUrl={certificateEligible ? `/certificate/${registration.id}` : null}
      />
    </main>
  );
}
