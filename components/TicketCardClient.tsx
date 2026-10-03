"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function TicketCardClient({
  event,
  registration,
  qr,
  statusLabel,
  certificateUrl,
}: {
  event: {
    title: string;
    cover_image_url: string | null;
    logo_url: string | null;
    location: string | null;
  };
  registration: {
    full_name: string;
    ticket_code: string;
    status: string;
    checked_in_at: string | null;
  };
  qr: string | null;
  statusLabel: string;
  when: string;
  certificateUrl: string | null;
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
        a.download = `${registration.ticket_code}.png`;
        a.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const img = new window.Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        pdf.save(`${registration.ticket_code}.pdf`);
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <div
        ref={cardRef}
        className="perf-edge w-full max-w-sm overflow-hidden rounded-2xl bg-paper pb-10 text-ink shadow-2xl"
      >
        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stub-600">
                {statusLabel}
              </p>
              <h1 className="mt-1 font-display text-2xl italic">{event.title}</h1>
            </div>
            {event.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.logo_url}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              />
            )}
          </div>
          {event.location && <p className="mt-1 text-sm text-ink/60">{event.location}</p>}

          {registration.status === "pending" ? (
            <div className="mt-6 rounded-xl bg-stub-50 p-6 text-center">
              <p className="text-3xl">👀</p>
              <p className="mt-2 text-sm text-ink/70">
                The host hasn&apos;t approved this request yet. Your ticket and QR
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

      {qr && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => download("png")}
            disabled={downloading !== null}
            className="rounded-full border border-paper/30 px-4 py-2 text-sm font-semibold text-paper hover:border-paper/60 disabled:opacity-50"
          >
            {downloading === "png" ? "Preparing…" : "Download PNG"}
          </button>
          <button
            onClick={() => download("pdf")}
            disabled={downloading !== null}
            className="rounded-full border border-paper/30 px-4 py-2 text-sm font-semibold text-paper hover:border-paper/60 disabled:opacity-50"
          >
            {downloading === "pdf" ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      )}

      {certificateUrl && (
        <div className="mt-4 text-center">
          <Link href={certificateUrl} className="text-sm font-semibold text-paper underline">
            View your certificate →
          </Link>
        </div>
      )}
    </div>
  );
}
