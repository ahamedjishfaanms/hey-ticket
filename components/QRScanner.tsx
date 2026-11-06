"use client";

import { useEffect, useRef, useState } from "react";

export default function QRScanner({
  onScan,
  active,
}: {
  onScan: (text: string) => void;
  active: boolean;
}) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            const now = Date.now();
            // Debounce duplicate reads of the same code within 2s.
            if (
              lastScanRef.current.text === decodedText &&
              now - lastScanRef.current.at < 2000
            ) {
              return;
            }
            lastScanRef.current = { text: decodedText, at: now };
            onScan(decodedText);
          },
          () => {
            // ignore per-frame decode failures
          }
        );
        if (!cancelled) setCameraError(null);
      } catch (err) {
        console.error("Could not start camera", err);
        const name = (err as any)?.name || String(err);
        setCameraError(
          /NotAllowed|Permission/i.test(name)
            ? "Camera access was blocked. Allow the camera for this site in your browser settings, then reload — or type the ticket code below."
            : /NotFound|Overconstrained|no camera/i.test(name)
            ? "No camera found on this device. Type the ticket code below instead."
            : "Couldn't start the camera. Type the ticket code below, or reload to try again."
        );
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {}).then(() => scanner.clear());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-paper/10 bg-ink">
      <div id={containerId} className="aspect-square w-full" />
      {cameraError && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <p className="text-4xl" aria-hidden>
            📷
          </p>
          <p className="text-sm text-paper/80">{cameraError}</p>
        </div>
      )}
    </div>
  );
}
