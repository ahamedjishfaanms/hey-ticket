import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { ticketQrDataUrl } from "@/lib/tickets";
import { certificatePatternDataUri } from "@/lib/certificatePattern";
import CertificateCardClient from "@/components/CertificateCardClient";
import type { EventRow, RegistrationRow } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const [registration] = (await sql`
    select * from registrations where id = ${params.id}
  `) as RegistrationRow[];

  if (!registration) notFound();

  const [event] = (await sql`
    select * from events where id = ${registration.event_id}
  `) as EventRow[];

  if (!event) notFound();

  const eligible =
    event.certificate_mode === "participation"
      ? registration.status === "confirmed" || registration.status === "waitlisted"
      : event.certificate_mode === "attendance"
      ? !!registration.checked_in_at
      : false;

  if (!eligible || !event.signer1_name || !event.signer1_signature_url) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16 text-paper">
        <div className="max-w-sm text-center">
          <p className="text-3xl">📜</p>
          <h1 className="mt-3 font-display text-2xl italic">Certificate not available</h1>
          <p className="mt-2 text-sm text-paper/60">
            {event.certificate_mode === "off"
              ? "This event's host hasn't enabled certificates."
              : event.certificate_mode === "attendance"
              ? "This certificate unlocks once you've checked in at the event."
              : "This certificate isn't available yet."}
          </p>
        </div>
      </main>
    );
  }

  const when = new Date(event.starts_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: event.timezone,
  });

  const heading =
    event.certificate_mode === "attendance" ? "Certificate of Attendance" : "Certificate of Participation";

  const verifyUrl = `${APP_URL}/certificate/${registration.id}`;
  const qr = await ticketQrDataUrl(verifyUrl);
  const background = certificatePatternDataUri(registration.ticket_code);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div className="w-full">
        <CertificateCardClient
          backgroundDataUri={background}
          logoUrl={event.logo_url}
          heading={heading}
          eventTitle={event.title}
          eventWhen={when}
          participantName={registration.full_name}
          serial={registration.ticket_code}
          qr={qr}
          signer1={{
            name: event.signer1_name,
            title: event.signer1_title,
            signatureUrl: event.signer1_signature_url,
          }}
          signer2={
            event.signer2_name && event.signer2_signature_url
              ? {
                  name: event.signer2_name,
                  title: event.signer2_title,
                  signatureUrl: event.signer2_signature_url,
                }
              : null
          }
        />
      </div>
    </main>
  );
}
