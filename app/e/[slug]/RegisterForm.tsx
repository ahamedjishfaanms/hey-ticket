"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm({
  eventId,
  isFull,
}: {
  eventId: string;
  isFull: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ waitlisted: boolean; ticketId: string } | null>(null);

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

    setDone({ waitlisted: data.waitlisted, ticketId: data.ticketId });
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-4xl">{done.waitlisted ? "⏳" : "🎟️"}</p>
        <p className="mt-3 font-display text-lg">
          {done.waitlisted ? "You're on the waitlist" : "You're in!"}
        </p>
        <p className="mt-1 text-sm text-ink/60">
          Check <strong>{email}</strong> for your confirmation.
        </p>
        <button
          onClick={() => router.push(`/ticket/${done.ticketId}`)}
          className="btn-primary mt-6 w-full"
        >
          View my ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="font-display text-lg">
        {isFull ? "Join the waitlist" : "Reserve your spot"}
      </p>
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
        {loading ? "Registering…" : isFull ? "Join waitlist" : "Get ticket"}
      </button>
    </form>
  );
}
