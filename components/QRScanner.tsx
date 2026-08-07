"use client";

import { useEffect, useRef } from "react";

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
      } catch (err) {
        console.error("Could not start camera", err);
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
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ink">
      <div id={containerId} className="aspect-square w-full" />
    </div>
  );
}
