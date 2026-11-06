"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import DateTimePicker from "@/components/DateTimePicker";
import CustomFieldsBuilder from "@/components/CustomFieldsBuilder";
import { LIMITS } from "@/lib/validation";
import type { CustomFieldDef } from "@/lib/types";

export interface EventFormValues {
  title: string;
  description: string;
  location: string;
  isOnline: boolean;
  startsAt: string; // "YYYY-MM-DDTHH:mm" wall-clock in `timezone`
  endsAt: string;
  capacity: string;
  coverImageUrl: string;
  requireApproval: boolean;
  customFields: CustomFieldDef[];
  timezone: string;
}

const EMPTY: EventFormValues = {
  title: "",
  description: "",
  location: "",
  isOnline: false,
  startsAt: "",
  endsAt: "",
  capacity: "",
  coverImageUrl: "",
  requireApproval: false,
  customFields: [],
  timezone: "",
};

function todayLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00`;
}

// Shared by "New event" and "Edit event". In edit mode the registration
// questions live in their own section on the manage page, so they're
// hidden here.
export default function EventForm({
  mode,
  eventId,
  initial,
}: {
  mode: "create" | "edit";
  eventId?: string;
  initial?: Partial<EventFormValues>;
}) {
  const router = useRouter();
  const [v, setV] = useState<EventFormValues>({ ...EMPTY, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const ids = {
    title: useId(),
    description: useId(),
    starts: useId(),
    ends: useId(),
    location: useId(),
    capacity: useId(),
  };

  // The browser's own time zone is used for new events; edits keep the
  // event's original zone so times don't shift if the host is travelling.
  useEffect(() => {
    if (!v.timezone) {
      setV((p) => ({ ...p, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }));
    }
  }, [v.timezone]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setDirty(true);
    setV((p) => ({ ...p, [key]: value }));
  }

  function clientCheck(): string | null {
    if (!v.title.trim()) return "Add an event title";
    if (!v.startsAt) return "Pick a start date and time";
    if (v.endsAt && v.endsAt <= v.startsAt) return "End time must be after the start time";
    if (!v.isOnline && !v.location.trim()) return "Add a location, or switch to online";
    if (v.isOnline && v.location.trim() && !/^https:\/\//i.test(v.location.trim()))
      return "Meeting link must start with https://";
    if (v.capacity) {
      const n = Number(v.capacity);
      if (!Number.isInteger(n) || n < 1 || n > LIMITS.capacityMax)
        return `Capacity must be a whole number between 1 and ${LIMITS.capacityMax.toLocaleString("en-US")}`;
    }
    return null;
  }

  function showError(msg: string) {
    setError(msg);
    // The error sits next to the submit button; make sure it's seen.
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const problem = clientCheck();
    if (problem) {
      showError(problem);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(mode === "create" ? "/api/events" : `/api/events/${eventId}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      // A server crash can come back as an empty or HTML body.
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.event) {
        showError(data?.error || "Something went wrong — please try again");
        return;
      }

      setDirty(false);
      router.push(`/dashboard/events/${data.event.id}`);
      router.refresh();
    } catch {
      showError("Couldn't reach the server — check your connection and try again");
    } finally {
      // Always re-enable the button, whatever happened.
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <div>
        <label htmlFor={ids.title} className="mb-1 block text-sm font-medium">
          Event title <span className="text-rose" aria-hidden>*</span>
        </label>
        <input
          id={ids.title}
          required
          aria-required
          maxLength={LIMITS.title}
          className="input"
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Founders' Night"
        />
      </div>

      <ImageUploader value={v.coverImageUrl} onChange={(u) => set("coverImageUrl", u)} />

      <div>
        <label htmlFor={ids.description} className="mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea
          id={ids.description}
          maxLength={LIMITS.description}
          className="input min-h-28"
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What should people expect?"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.starts} className="mb-1 block text-sm font-medium">
            Starts <span className="text-rose" aria-hidden>*</span>
          </label>
          <DateTimePicker
            id={ids.starts}
            value={v.startsAt}
            onChange={(val) => set("startsAt", val)}
            // New events can't start in the past; edits of an event that
            // already happened may still need fixing.
            min={mode === "create" ? todayLocal() : undefined}
          />
        </div>
        <div>
          <label htmlFor={ids.ends} className="mb-1 block text-sm font-medium">
            Ends <span className="font-normal text-ink/40">(optional)</span>
          </label>
          <DateTimePicker
            id={ids.ends}
            value={v.endsAt}
            onChange={(val) => set("endsAt", val)}
            min={v.startsAt || (mode === "create" ? todayLocal() : undefined)}
            defaultDate={v.startsAt}
            align="right"
            clearable
          />
        </div>
      </div>
      {v.timezone && (
        <p className="-mt-3 text-xs text-ink/40">
          Times are in {v.timezone.replace(/_/g, " ")}.
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor={ids.location} className="text-sm font-medium">
            {v.isOnline ? "Meeting link" : "Location"}{" "}
            {!v.isOnline && (
              <span className="text-rose" aria-hidden>
                *
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={() => set("isOnline", !v.isOnline)}
            className="text-xs font-semibold text-stub-600"
          >
            Switch to {v.isOnline ? "in-person" : "online"}
          </button>
        </div>
        <input
          id={ids.location}
          type={v.isOnline ? "url" : "text"}
          inputMode={v.isOnline ? "url" : undefined}
          maxLength={v.isOnline ? LIMITS.url : LIMITS.location}
          className="input"
          value={v.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder={v.isOnline ? "https://meet.google.com/..." : "123 Main St, City"}
        />
        {v.isOnline && (
          <p className="mt-1 text-xs text-ink/40">
            Only shown to confirmed attendees, on their ticket.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={ids.capacity} className="mb-1 block text-sm font-medium">
          Capacity <span className="font-normal text-ink/40">(optional)</span>
        </label>
        <input
          id={ids.capacity}
          type="number"
          inputMode="numeric"
          min={1}
          max={LIMITS.capacityMax}
          step={1}
          className="input"
          value={v.capacity}
          onChange={(e) => set("capacity", e.target.value)}
          placeholder="Leave blank for unlimited"
        />
        <p className="mt-1 text-xs text-ink/40">
          Once it&apos;s full, new registrations join a waitlist.
        </p>
      </div>

      <fieldset className="rounded-xl border border-ink/10 bg-white p-4">
        <legend className="px-1 text-sm font-medium">How should registrations work?</legend>
        <div className="mt-1 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 p-3 has-[:checked]:border-stub-500 has-[:checked]:bg-stub-50">
            <input
              type="radio"
              name="approval"
              value="instant"
              checked={!v.requireApproval}
              onChange={() => set("requireApproval", false)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold">Instant ticket</span>
              <span className="block text-xs text-ink/50">
                Anyone who registers gets their ticket by email right away.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 p-3 has-[:checked]:border-stub-500 has-[:checked]:bg-stub-50">
            <input
              type="radio"
              name="approval"
              value="approval"
              checked={v.requireApproval}
              onChange={() => set("requireApproval", true)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold">Requires your approval</span>
              <span className="block text-xs text-ink/50">
                Registrations sit as pending until you approve them from the
                dashboard — the ticket is only sent once you do.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {mode === "create" && (
        <div>
          <p className="text-sm font-medium">Registration form questions</p>
          <p className="mt-1 text-xs text-ink/50">
            Everyone always gives their name and email. Add more questions here —
            short answer, paragraph, multiple choice, or checkbox — like a lightweight
            Google Form built into your event page.
          </p>
          <div className="mt-3">
            <CustomFieldsBuilder fields={v.customFields} onChange={(f) => set("customFields", f)} />
          </div>
        </div>
      )}

      {error && (
        <p ref={errorRef} role="alert" className="rounded-lg bg-rose/5 px-3 py-2 text-sm text-rose">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading
          ? mode === "create"
            ? "Creating…"
            : "Saving…"
          : mode === "create"
          ? "Create event"
          : "Save changes"}
      </button>
    </form>
  );
}
