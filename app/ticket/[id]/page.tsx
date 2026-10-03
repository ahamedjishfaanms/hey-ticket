import { notFound } from "next/navigation";
import Image from "next/image";
import { sql } from "@/lib/db";
import { ticketQrDataUrl } from "@/lib/tickets";
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div className="perf-edge w-full max-w-sm overflow-hidden rounded-2xl bg-paper pb-10 text-ink shadow-2xl">
        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="p-6 pb-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stub-600">
            {statusLabel}
          </p>
          <h1 className="mt-1 font-display text-2xl italic">{event.title}</h1>
          <p className="mt-1 text-sm text-ink/60">{when}</p>
          {event.location && <p className="text-sm text-ink/60">{event.location}</p>}

          {registration.status === "pending" ? (
            <div className="mt-6 rounded-xl bg-stub-50 p-6 text-center">
              <p className="text-3xl">👀</p>
              <p className="mt-2 text-sm text-ink/70">
                The host hasn't approved this request yet. Your ticket and QR
                code will appear here the moment they do.
              </p>
            </div>
          ) : qr ? (
            <div className="mt-6 flex justify-center rounded-xl bg-white p-6">
              <Image
                src={qr}
                alt={`QR code for ticket ${registration.ticket_code}`}
                width={220}
                height={220}
              />
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-ink/20 pt-6">
            <div>
              <p className="text-xs text-ink/40">Ticket holder</p>
              <p className="font-medium">{registration.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink/40">Code</p>
              <p className="font-mono text-sm">{registration.ticket_code}</p>
            </div>
          </div>

          {registration.checked_in_at && (
            <p className="mt-4 rounded-lg bg-cord/10 px-3 py-2 text-center text-xs font-semibold text-cord">
              Checked in at{" "}
              {new Date(registration.checked_in_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
