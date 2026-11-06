import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import type { CertificateMode } from "@/lib/types";
import { optionalHttpsUrl } from "@/lib/validation";

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

  const body = await request.json().catch(() => ({}));

  const modeIn = body.certificateMode ?? "off";
  if (!VALID_MODES.includes(modeIn)) {
    return NextResponse.json(
      { error: "Certificate mode must be off, participation or attendance" },
      { status: 400 }
    );
  }
  const certificateMode: CertificateMode = modeIn;

  const text = (v: unknown, max = 120) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  const urls: Record<string, string | null> = {};
  for (const [key, label] of [
    ["logoUrl", "Logo"],
    ["signer1SignatureUrl", "Signer 1 signature"],
    ["signer2SignatureUrl", "Signer 2 signature"],
  ] as const) {
    const r = optionalHttpsUrl(body[key], label);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    urls[key] = r.value;
  }

  const logoUrl = urls.logoUrl;
  const signer1Name = text(body.signer1Name);
  const signer1Title = text(body.signer1Title);
  const signer1SignatureUrl = urls.signer1SignatureUrl;
  const signer2Name = text(body.signer2Name);
  const signer2Title = text(body.signer2Title);
  const signer2SignatureUrl = urls.signer2SignatureUrl;

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
