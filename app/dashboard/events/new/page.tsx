"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import DateTimePicker from "@/components/DateTimePicker";
import CustomFieldsBuilder from "@/components/CustomFieldsBuilder";
import type { CustomFieldDef } from "@/lib/types";

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        location,
        isOnline,
        startsAt,
        endsAt,
        capacity,
        coverImageUrl,
        requireApproval,
        customFields,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    router.push(`/dashboard/events/${data.event.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl italic">New event</h1>
      <p className="mt-1 text-sm text-ink/60">
        Fill in the essentials — you can edit everything later, including
        publishing when you're ready.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Event title</label>
          <input
            required
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Founders' Night"
          />
        </div>

        <ImageUploader value={coverImageUrl} onChange={setCoverImageUrl} />

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            className="input min-h-28"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should people expect?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Starts</label>
            <DateTimePicker value={startsAt} onChange={setStartsAt} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ends (optional)</label>
            <DateTimePicker value={endsAt} onChange={setEndsAt} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">
              {isOnline ? "Meeting link" : "Location"}
            </label>
            <button
              type="button"
              onClick={() => setIsOnline((v) => !v)}
              className="text-xs font-semibold text-stub-600"
            >
              Switch to {isOnline ? "in-person" : "online"}
            </button>
          </div>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={isOnline ? "https://..." : "123 Main St, City"}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Capacity (optional)
          </label>
          <input
            type="number"
            min={1}
            className="input"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Leave blank for unlimited"
          />
        </div>

        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <p className="text-sm font-medium">How should registrations work?</p>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 p-3 has-[:checked]:border-stub-500 has-[:checked]:bg-stub-50">
              <input
                type="radio"
                name="approval"
                checked={!requireApproval}
                onChange={() => setRequireApproval(false)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Instant ticket
                </span>
                <span className="block text-xs text-ink/50">
                  Anyone who registers gets their ticket by email right away.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 p-3 has-[:checked]:border-stub-500 has-[:checked]:bg-stub-50">
              <input
                type="radio"
                name="approval"
                checked={requireApproval}
                onChange={() => setRequireApproval(true)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Requires your approval
                </span>
                <span className="block text-xs text-ink/50">
                  Registrations sit as pending until you approve them from the
                  dashboard — the ticket is only sent once you do.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Registration form questions</p>
          <p className="mt-1 text-xs text-ink/50">
            Everyone always gives their name and email. Add more questions here —
            short answer, paragraph, multiple choice, or checkbox — like a lightweight
            Google Form built into your event page.
          </p>
          <div className="mt-3">
            <CustomFieldsBuilder fields={customFields} onChange={setCustomFields} />
          </div>
        </div>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button disabled={loading} className="btn-primary w-full">
          {loading ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
