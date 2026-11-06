import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ticketQrPngBuffer } from "@/lib/tickets";

// Serves a ticket's QR code as a plain PNG image, so it can be embedded
// with a normal <img src="..."> tag inside an email — most email clients
// (Gmail included) strip inline data: URIs, but they load a regular
// https:// image URL fine. Same exposure level as the public ticket page
// at /ticket/[id]: no auth, since the recipient reading the email isn't
// signed in, and the ticket code alone can't do anything without also
// being scanned at the door by an authenticated organizer.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [registration] = await sql`
    select status, ticket_code from registrations where id = ${params.id}
  `;

  if (!registration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only a confirmed ticket gets a real QR. Waitlisted, pending and
  // cancelled registrations are all refused at the door, so handing them
  // a scannable code only makes people think they're in.
  if (registration.status !== "confirmed") {
    return NextResponse.json({ error: "No QR for this ticket" }, { status: 404 });
  }

  const png = await ticketQrPngBuffer(registration.ticket_code);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
