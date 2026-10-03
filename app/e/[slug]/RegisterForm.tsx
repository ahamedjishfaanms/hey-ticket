"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm({
  eventId,
  isFull,
  requiresApproval,
}: {
  eventId: string;
  isFull: boolean;
  requiresApproval: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    waitlisted: boolean;
    pending: boolean;
    ticketId: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, fullName, email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setDone({ waitlisted: data.waitlisted, pending: data.pending, ticketId: data.ticketId });
  }

  if (done) {
    const icon = done.pending ? "👀" : done.waitlisted ? "⏳" : "🎟️";
    const title = done.pending
      ? "Request sent"
      : done.waitlisted
      ? "You're on the waitlist"
      : "You're in!";
    const subtitle = done.pending
      ? `The host needs to approve your request — check ${email} once they do.`
      : `Check ${email} for your confirmation.`;

    return (
      <div className="text-center">
        <p className="text-4xl">{icon}</p>
        <p className="mt-3 font-display text-lg">{title}</p>
        <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
        {!done.pending && (
          <button
            onClick={() => router.push(`/ticket/${done.ticketId}`)}
            className="btn-primary mt-6 w-full"
          >
            View my ticket
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="font-display text-lg">
        {isFull ? "Join the waitlist" : requiresApproval ? "Request to join" : "Reserve your spot"}
      </p>
      {requiresApproval && !isFull && (
        <p className="-mt-2 text-xs text-ink/50">
          The host reviews every request before sending a ticket.
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">Full name</label>
        <input
          required
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ada Lovelace"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          required
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      {error && <p className="text-sm text-rose">{error}</p>}
      <button disabled={loading} className="btn-primary w-full">
        {loading
          ? "Submitting…"
          : isFull
          ? "Join waitlist"
          : requiresApproval
          ? "Request to join"
          : "Get ticket"}
      </button>
    </form>
  );
}
