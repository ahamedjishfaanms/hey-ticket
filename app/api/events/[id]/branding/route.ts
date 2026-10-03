import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import type { CertificateMode } from "@/lib/types";

const VALID_MODES: CertificateMode[] = ["off", "participation", "attendance"];

// Saves ticket branding (logo) and certificate settings (mode + up to two
// authorized signatures). Co-hosts may manage this too, same as the rest
// of the event-manage surface.
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

  const body = await request.json();

  const logoUrl: string | null = body.logoUrl?.trim() || null;
  const certificateMode: CertificateMode = VALID_MODES.includes(body.certificateMode)
    ? body.certificateMode
    : "off";

  const signer1Name: string | null = body.signer1Name?.trim() || null;
  const signer1Title: string | null = body.signer1Title?.trim() || null;
  const signer1SignatureUrl: string | null = body.signer1SignatureUrl?.trim() || null;

  const signer2Name: string | null = body.signer2Name?.trim() || null;
  const signer2Title: string | null = body.signer2Title?.trim() || null;
  const signer2SignatureUrl: string | null = body.signer2SignatureUrl?.trim() || null;

  // If certificates are turned on, require at least the first signature —
  // a certificate with no authorized signer doesn't mean much.
  if (
    certificateMode !== "off" &&
    (!signer1Name || !signer1SignatureUrl)
  ) {
    return NextResponse.json(
      { error: "Add at least one authorized signer (name + signature image) before turning certificates on." },
      { status: 400 }
    );
  }

  const [updated] = await sql`
    update events set
      logo_url = ${logoUrl},
      certificate_mode = ${certificateMode},
      signer1_name = ${signer1Name},
      signer1_title = ${signer1Title},
      signer1_signature_url = ${signer1SignatureUrl},
      signer2_name = ${signer2Name},
      signer2_title = ${signer2Title},
      signer2_signature_url = ${signer2SignatureUrl}
    where id = ${params.id}
    returning *
  `;

  return NextResponse.json({ event: updated });
}
