"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import type { AgendaItem, EventRow, FaqItem, SpeakerItem } from "@/lib/types";

const newId = () => Math.random().toString(36).slice(2, 10);

// Organizer-side editor for the public event page's optional sections.
// Empty sections simply don't render on the public page.
export default function EventPageDetailsEditor({ event }: { event: EventRow }) {
  const [agenda, setAgenda] = useState<AgendaItem[]>(event.agenda || []);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>(event.speakers || []);
  const [faqs, setFaqs] = useState<FaqItem[]>(event.faqs || []);
  const [venueNotes, setVenueNotes] = useState(event.venue_notes || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agenda, speakers, faqs, venueNotes }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function update<T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    patch: Partial<T>
  ) {
    setter((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  return (
    <div className="mt-10">
      <h2 className="font-display text-xl">Event page details</h2>
      <p className="mt-1 text-sm text-ink/50">
        Optional sections for your public page. Anything left empty is hidden.
      </p>

      {/* Agenda */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold">Agenda</h3>
        <div className="mt-2 space-y-2">
          {agenda.map((a) => (
            <div key={a.id} className="flex gap-2">
              <input
                value={a.time}
                onChange={(e) => update(setAgenda, a.id, { time: e.target.value })}
                placeholder="7:00 PM"
                className="input w-28 shrink-0"
              />
              <input
                value={a.title}
                onChange={(e) => update(setAgenda, a.id, { title: e.target.value })}
                placeholder="Doors open & welcome drinks"
                className="input flex-1"
              />
              <RemoveButton onClick={() => setAgenda((p) => p.filter((x) => x.id !== a.id))} />
            </div>
          ))}
        </div>
        <AddButton onClick={() => setAgenda((p) => [...p, { id: newId(), time: "", title: "" }])}>
          Add agenda item
        </AddButton>
      </section>

      {/* Speakers */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold">Speakers &amp; hosts</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {speakers.map((s) => (
            <div key={s.id} className="rounded-xl border border-ink/10 bg-white p-3">
              <div className="flex gap-3">
                <div className="w-20 shrink-0">
                  <ImageUploader
                    value={s.photo_url}
                    onChange={(url) => update(setSpeakers, s.id, { photo_url: url })}
                    label=""
                    helpText="Photo"
                    previewClassName="h-20 w-20 rounded-full object-cover"
                    boxClassName="h-20 w-20 rounded-full"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    value={s.name}
                    onChange={(e) => update(setSpeakers, s.id, { name: e.target.value })}
                    placeholder="Name"
                    className="input"
                  />
                  <input
                    value={s.role}
                    onChange={(e) => update(setSpeakers, s.id, { role: e.target.value })}
                    placeholder="Role, e.g. Founder, Acme"
                    className="input"
                  />
                </div>
              </div>
              <div className="mt-2 text-end">
                <RemoveButton
                  onClick={() => setSpeakers((p) => p.filter((x) => x.id !== s.id))}
                />
              </div>
            </div>
          ))}
        </div>
        <AddButton
          onClick={() =>
            setSpeakers((p) => [...p, { id: newId(), name: "", role: "", photo_url: "" }])
          }
        >
          Add speaker or host
        </AddButton>
      </section>

      {/* FAQ */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold">FAQ</h3>
        <p className="text-xs text-ink/40">
          Refund policy, entry rules, age limit, dress code…
        </p>
        <div className="mt-2 space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="space-y-2 rounded-xl border border-ink/10 bg-white p-3">
              <div className="flex gap-2">
                <input
                  value={f.question}
                  onChange={(e) => update(setFaqs, f.id, { question: e.target.value })}
                  placeholder="Is there an age limit?"
                  className="input flex-1"
                />
                <RemoveButton onClick={() => setFaqs((p) => p.filter((x) => x.id !== f.id))} />
              </div>
              <textarea
                value={f.answer}
                onChange={(e) => update(setFaqs, f.id, { answer: e.target.value })}
                placeholder="Yes — 18+ only. Please bring a valid ID."
                rows={2}
                className="input"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <AddButton
            onClick={() => setFaqs((p) => [...p, { id: newId(), question: "", answer: "" }])}
          >
            Add question
          </AddButton>
          {faqs.length === 0 && (
            <AddButton
              onClick={() =>
                setFaqs([
                  { id: newId(), question: "What is the refund policy?", answer: "" },
                  { id: newId(), question: "What are the entry rules?", answer: "" },
                  { id: newId(), question: "Is there an age limit?", answer: "" },
                  { id: newId(), question: "Is there a dress code?", answer: "" },
                ])
              }
            >
              Start with common questions
            </AddButton>
          )}
        </div>
      </section>

      {/* Venue notes */}
      {!event.is_online && (
        <section className="mt-8">
          <h3 className="text-sm font-semibold">Directions &amp; parking</h3>
          <textarea
            value={venueNotes}
            onChange={(e) => setVenueNotes(e.target.value)}
            rows={3}
            placeholder="Enter from the side gate. Free parking in basement B2…"
            className="input mt-2"
          />
        </section>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save page details"}
        </button>
        {saved && <span className="text-sm text-cord">Saved ✓</span>}
      </div>
      {error && <p className="mt-2 text-sm text-rose">{error}</p>}
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-full border border-dashed border-ink/25 px-4 py-1.5 text-sm font-semibold text-ink/60 hover:border-stub-400 hover:text-stub-600"
    >
      + {children}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-2 text-xs font-semibold text-ink/40 hover:text-rose"
      aria-label="Remove"
    >
      Remove
    </button>
  );
}
