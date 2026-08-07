"use client";

import { useState } from "react";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import type { EventRow } from "@/lib/types";

type Result =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "success"; name: string; alreadyIn: boolean }
  | { state: "error"; message: string };

export default function CheckinClient({ event }: { event: EventRow }) {
  const [result, setResult] = useState<Result>({ state: "idle" });
  const [manualCode, setManualCode] = useState("");
  const [scannerActive, setScannerActive] = useState(true);

  async function submitCode(code: string) {
    setResult({ state: "checking" });
    setScannerActive(false);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, ticketCode: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ state: "error", message: data.error || "Ticket not found" });
      } else {
        setResult({
          state: "success",
          name: data.registration.full_name,
          alreadyIn: data.alreadyCheckedIn,
        });
      }
    } catch {
      setResult({ state: "error", message: "Network error — try again" });
    }
  }

  function reset() {
    setResult({ state: "idle" });
    setManualCode("");
    setScannerActive(true);
  }

  return (
    <main className="min-h-screen bg-ink px-6 py-10 text-paper">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/events/${event.id}`} className="text-sm text-paper/50">
            ← Back
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest text-stub-400">
            Door scan
          </p>
        </div>
        <h1 className="mt-2 font-display text-2xl italic">{event.title}</h1>

        <div className="mt-6">
          {result.state === "idle" || result.state === "checking" ? (
            <QRScanner active={scannerActive} onScan={submitCode} />
          ) : (
            <ResultCard result={result} onScanAnother={reset} />
          )}
        </div>

        {(result.state === "idle" || result.state === "checking") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) submitCode(manualCode.trim().toUpperCase());
            }}
            className="mt-6 flex gap-2"
          >
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or type ticket code, e.g. HT-7K2QX9"
              className="flex-1 rounded-lg border border-paper/20 bg-transparent px-3 py-2.5 font-mono text-sm text-paper placeholder:text-paper/30 focus-ring"
            />
            <button className="btn-primary bg-stub-500 text-ink hover:bg-stub-400">
              Check in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function ResultCard({
  result,
  onScanAnother,
}: {
  result: Extract<Result, { state: "success" | "error" }>;
  onScanAnother: () => void;
}) {
  const isSuccess = result.state === "success";
  return (
    <div
      className={`rounded-2xl px-6 py-10 text-center ${
        isSuccess ? "bg-cord/20" : "bg-rose/20"
      }`}
    >
      {isSuccess ? (
        <>
          <p className="text-5xl">{result.alreadyIn ? "↺" : "✓"}</p>
          <p className="mt-4 font-display text-xl">{result.name}</p>
          <p className="mt-1 text-sm text-paper/60">
            {result.alreadyIn ? "Already checked in" : "Checked in"}
          </p>
        </>
      ) : (
        <>
          <p className="text-5xl">✕</p>
          <p className="mt-4 font-display text-xl">Not found</p>
          <p className="mt-1 text-sm text-paper/60">{result.message}</p>
        </>
      )}
      <button onClick={onScanAnother} className="btn-primary mt-6 bg-stub-500 text-ink hover:bg-stub-400">
        Scan next
      </button>
    </div>
  );
}
