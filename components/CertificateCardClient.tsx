"use client";

import { useRef, useState } from "react";

export default function CertificateCardClient({
  backgroundDataUri,
  logoUrl,
  heading,
  eventTitle,
  eventWhen,
  participantName,
  serial,
  qr,
  signer1,
  signer2,
}: {
  backgroundDataUri: string;
  logoUrl: string | null;
  heading: string;
  eventTitle: string;
  eventWhen: string;
  participantName: string;
  serial: string;
  qr: string;
  signer1: { name: string; title: string | null; signatureUrl: string };
  signer2: { name: string; title: string | null; signatureUrl: string } | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);

  async function download(kind: "png" | "pdf") {
    if (!cardRef.current) return;
    setDownloading(kind);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#FBF7EF" });

      if (kind === "png") {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${serial}-certificate.png`;
        a.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const img = new window.Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        pdf.save(`${serial}-certificate.pdf`);
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <div
        ref={cardRef}
        className="relative mx-auto aspect-[900/640] w-full max-w-3xl overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-2xl"
        style={{
          backgroundImage: `url(${backgroundDataUri})`,
          backgroundSize: "cover",
        }}
      >
        <div className="flex h-full flex-col items-center justify-between px-10 py-8 text-center sm:px-16 sm:py-12">
          <div className="flex w-full items-center justify-between">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <span />
            )}
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
              Serial {serial}
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-stub-600">
              {heading}
            </p>
            <p className="mt-4 text-sm text-ink/60">This certifies that</p>
            <h1 className="mt-2 font-display text-4xl italic">{participantName}</h1>
            <p className="mt-4 text-sm text-ink/70">
              participated in <strong>{eventTitle}</strong>
            </p>
            <p className="text-sm text-ink/50">{eventWhen}</p>
          </div>

          <div className="flex w-full items-end justify-between gap-6">
            <SignatureBlock signer={signer1} />
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Verification QR code" className="h-20 w-20" />
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink/30">
                Scan to verify
              </p>
            </div>
            {signer2 ? <SignatureBlock signer={signer2} /> : <span className="w-28" />}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => download("png")}
          disabled={downloading !== null}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-ink/40 disabled:opacity-50"
        >
          {downloading === "png" ? "Preparing…" : "Download PNG"}
        </button>
        <button
          onClick={() => download("pdf")}
          disabled={downloading !== null}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-ink/40 disabled:opacity-50"
        >
          {downloading === "pdf" ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

function SignatureBlock({
  signer,
}: {
  signer: { name: string; title: string | null; signatureUrl: string };
}) {
  return (
    <div className="w-28 flex-shrink-0 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={signer.signatureUrl}
        alt={`${signer.name}'s signature`}
        className="mx-auto h-10 object-contain"
      />
      <div className="mt-1 border-t border-ink/20 pt-1">
        <p className="text-xs font-semibold leading-tight">{signer.name}</p>
        {signer.title && <p className="text-[10px] text-ink/50 leading-tight">{signer.title}</p>}
      </div>
    </div>
  );
}
