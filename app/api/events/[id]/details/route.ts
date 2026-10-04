import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import { sanitizeAgenda, sanitizeFaqs, sanitizeSpeakers } from "@/lib/eventDetails";

// Saves the public event page's extra sections: agenda, speakers/hosts,
// FAQ, and venue/parking notes. Organizer or co-host.
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
  const agenda = sanitizeAgenda(body?.agenda);
  const speakers = sanitizeSpeakers(body?.speakers);
  const faqs = sanitizeFaqs(body?.faqs);
  const venueNotes =
    typeof body?.venueNotes === "string" ? body.venueNotes.trim().slice(0, 2000) : "";

  const [updated] = await sql`
    update events set
      agenda = ${JSON.stringify(agenda)},
      speakers = ${JSON.stringify(speakers)},
      faqs = ${JSON.stringify(faqs)},
      venue_notes = ${venueNotes || null}
    where id = ${params.id}
    returning *
  `;

  return NextResponse.json({ event: updated });
}
