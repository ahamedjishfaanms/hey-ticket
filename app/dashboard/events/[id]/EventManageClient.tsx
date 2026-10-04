"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";
import CustomFieldsBuilder from "@/components/CustomFieldsBuilder";
import EventPageDetailsEditor from "@/components/EventPageDetailsEditor";
import type {
  CertificateMode,
  CustomFieldDef,
  EventCollaboratorRow,
  EventRow,
  RegistrationRow,
} from "@/lib/types";

export default function EventManageClient({
  event,
  role,
  initialRegistrations,
  initialCollaborators,
}: {
  event: EventRow;
  role: "organizer" | "cohost";
  initialRegistrations: RegistrationRow[];
  initialCollaborators: EventCollaboratorRow[];
}) {
  const [isPublished, setIsPublished] = useState(event.is_published);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cohostEmail, setCohostEmail] = useState("");
  const [cohostBusy, setCohostBusy] = useState(false);
  const [cohostError, setCohostError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Branding & certificates
  const [logoUrl, setLogoUrl] = useState(event.logo_url || "");
  const [certificateMode, setCertificateMode] = useState<CertificateMode>(event.certificate_mode);
  const [signer1Name, setSigner1Name] = useState(event.signer1_name || "");
  const [signer1Title, setSigner1Title] = useState(event.signer1_title || "");
  const [signer1SignatureUrl, setSigner1SignatureUrl] = useState(event.signer1_signature_url || "");
  const [signer2Name, setSigner2Name] = useState(event.signer2_name || "");
  const [signer2Title, setSigner2Title] = useState(event.signer2_title || "");
  const [signer2SignatureUrl, setSigner2SignatureUrl] = useState(event.signer2_signature_url || "");
  const [brandingBusy, setBrandingBusy] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Post-event
  const [galleryUrl, setGalleryUrl] = useState(event.gallery_url || "");
  const [thankYouMessage, setThankYouMessage] = useState(event.thank_you_message || "");
  const [audience, setAudience] = useState<"all_confirmed" | "checked_in_only">("all_confirmed");
  const [sendMessage, setSendMessage] = useState(true);
  const [sendGallery, setSendGallery] = useState(true);
  const [sendCertificate, setSendCertificate] = useState(true);
  const [thankYouBusy, setThankYouBusy] = useState(false);
  const [thankYouResult, setThankYouResult] = useState<string | null>(null);

  // Registration form
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>(event.custom_fields || []);
  const [formBusy, setFormBusy] = useState(false);
  const [formSaved, setFormSaved] = useState(false);

  const eventUrl = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`,
    [event.slug]
  );

  const pending = registrations.filter((r) => r.status === "pending");
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const waitlisted = registrations.filter((r) => r.status === "waitlisted");
  const checkedIn = registrations.filter((r) => r.checked_in_at);

  async function togglePublish() {
    setBusy(true);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !isPublished }),
    });
    setBusy(false);
    if (res.ok) setIsPublished(!isPublished);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function decide(registrationId: string, decision: "approve" | "reject") {
    setDecidingId(registrationId);
    const res = await fetch(`/api/registrations/${registrationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setDecidingId(null);
    if (res.ok) {
      const { registration } = await res.json();
      setRegistrations((prev) => prev.map((r) => (r.id === registration.id ? registration : r)));
    }
  }

  async function addCohost(e: React.FormEvent) {
    e.preventDefault();
    setCohostBusy(true);
    setCohostError(null);
    const res = await fetch(`/api/events/${event.id}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cohostEmail }),
    });
    const data = await res.json();
    setCohostBusy(false);
    if (!res.ok) {
      setCohostError(data.error || "Could not add co-host");
      return;
    }
    setCollaborators((prev) => [...prev, data.collaborator]);
    setCohostEmail("");
  }

  async function removeCohost(collaboratorId: string) {
    await fetch(`/api/events/${event.id}/collaborators`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId }),
    });
    setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
  }

  async function saveBranding() {
    setBrandingBusy(true);
    setBrandingError(null);
    setBrandingSaved(false);
    const res = await fetch(`/api/events/${event.id}/branding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logoUrl,
        certificateMode,
        signer1Name,
        signer1Title,
        signer1SignatureUrl,
        signer2Name,
        signer2Title,
        signer2SignatureUrl,
      }),
    });
    const data = await res.json();
    setBrandingBusy(false);
    if (!res.ok) {
      setBrandingError(data.error || "Could not save");
      return;
    }
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 2500);
  }

  async function sendThankYous() {
    setThankYouBusy(true);
    setThankYouResult(null);
    const res = await fetch(`/api/events/${event.id}/thank-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience,
        galleryUrl,
        message: thankYouMessage,
        sendMessage,
        sendGallery,
        sendCertificate,
      }),
    });
    const data = await res.json();
    setThankYouBusy(false);
    if (!res.ok) {
      setThankYouResult(data.error || "Something went wrong");
      return;
    }
    setRegistrations((prev) =>
      prev.map((r) =>
        r.thank_you_sent_at || data.sent === 0
          ? r
          : { ...r, thank_you_sent_at: new Date().toISOString() }
      )
    );
    setThankYouResult(
      data.total === 0
        ? "Everyone in this audience has already been thanked."
        : `Sent ${data.sent} of ${data.total}${data.failed ? ` (${data.failed} failed)` : ""}${
            data.skippedNoContent ? ` — ${data.skippedNoContent} skipped (nothing eligible to send)` : ""
          }.`
    );
  }

  async function saveCustomFields() {
    setFormBusy(true);
    setFormSaved(false);
    const res = await fetch(`/api/events/${event.id}/form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customFields }),
    });
    setFormBusy(false);
    if (res.ok) {
      setFormSaved(true);
      setTimeout(() => setFormSaved(false), 2500);
    }
  }

  function exportCsv() {
    const extraHeaders = (event.custom_fields || []).map((f) => f.label);
    const header = ["Name", "Email", "Status", "Checked in", "Ticket code", ...extraHeaders].join(",") + "\n";
    const rows = registrations
      .map((r) =>
        [
          r.full_name,
          r.email,
          r.status,
          r.checked_in_at ? "yes" : "no",
          r.ticket_code,
          ...(event.custom_fields || []).map((f) => {
            const v = r.custom_field_responses?.[f.id];
            return v === true ? "yes" : v === false || v == null ? "" : String(v);
          }),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="mb-6 h-40 w-full rounded-xl object-cover"
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
            {new Date(event.starts_at).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            {role === "cohost" && " · You're a co-host"}
          </p>
          <h1 className="font-display text-3xl italic">{event.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/events/${event.id}/checkin`}
            className="btn-secondary"
          >
            Open scanner
          </Link>
          <button
            onClick={togglePublish}
            disabled={busy || (event.moderation_status === "suspended" && !isPublished)}
            className="btn-primary"
          >
            {isPublished ? "Unpublish" : "Publish event"}
          </button>
        </div>
      </div>

      {event.moderation_status === "suspended" && (
        <div className="mt-4 rounded-lg border border-rose/30 bg-rose/5 px-4 py-3 text-sm">
          <p className="font-semibold text-rose">This event was suspended by the HeyTicket team.</p>
          <p className="mt-1 text-ink/70">
            It&apos;s hidden from the public and closed to new registrations.
            {event.moderation_note ? ` Reason: ${event.moderation_note}` : ""} Reply to the
            suspension email if you think this is a mistake.
          </p>
        </div>
      )}

      {isPublished && event.moderation_status !== "suspended" && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-cord/10 px-4 py-3">
          <code className="flex-1 truncate font-mono text-sm text-cord">{eventUrl}</code>
          <button onClick={copyLink} className="text-sm font-semibold text-cord">
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Pending" value={pending.length} />
        <Stat label="Confirmed" value={confirmed.length} />
        <Stat label="Waitlisted" value={waitlisted.length} />
        <Stat label="Checked in" value={checkedIn.length} />
      </div>

      {pending.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl">Needs your approval</h2>
          <div className="mt-4 space-y-2">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-stub-400/40 bg-stub-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{r.full_name}</p>
                  <p className="text-xs text-ink/50">{r.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(r.id, "reject")}
                    disabled={decidingId === r.id}
                    className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:border-rose hover:text-rose"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => decide(r.id, "approve")}
                    disabled={decidingId === r.id}
                    className="rounded-full bg-cord px-3 py-1.5 text-xs font-semibold text-paper hover:bg-cord/80"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl">Attendees</h2>
        {registrations.length > 0 && (
          <button onClick={exportCsv} className="text-sm font-semibold text-stub-600">
            Export CSV
          </button>
        )}
      </div>

      {registrations.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">
          No registrations yet. Share your event link to start collecting them.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/5 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Checked in</th>
                <th className="px-4 py-3">Ticket</th>
                {event.custom_fields && event.custom_fields.length > 0 && (
                  <th className="px-4 py-3"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const hasAnswers = event.custom_fields && event.custom_fields.length > 0;
                const isExpanded = expandedId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-ink/5">
                      <td className="px-4 py-3">{r.full_name}</td>
                      <td className="px-4 py-3 text-ink/60">{r.email}</td>
                      <td className="px-4 py-3 capitalize">{r.status}</td>
                      <td className="px-4 py-3">
                        {r.checked_in_at ? (
                          <span className="text-cord">
                            {new Date(r.checked_in_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-ink/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.ticket_code}</td>
                      {hasAnswers && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                            className="text-xs font-semibold text-stub-600"
                          >
                            {isExpanded ? "Hide" : "Answers"}
                          </button>
                        </td>
                      )}
                    </tr>
                    {hasAnswers && isExpanded && (
                      <tr className="border-t border-ink/5 bg-stub-50">
                        <td colSpan={6} className="px-4 py-3">
                          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                            {event.custom_fields.map((f) => {
                              const v = r.custom_field_responses?.[f.id];
                              return (
                                <div key={f.id}>
                                  <dt className="text-ink/40">{f.label}</dt>
                                  <dd className="font-medium">
                                    {v === true ? "Yes" : v === false || v == null || v === "" ? "—" : String(v)}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {role === "organizer" && (
        <div className="mt-10">
          <h2 className="font-display text-xl">Co-hosts</h2>
          <p className="mt-1 text-sm text-ink/50">
            Add someone by email to let them manage this event — see
            registrations, approve requests, and check people in.
          </p>

          {collaborators.length > 0 && (
            <div className="mt-4 space-y-2">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-2.5"
                >
                  <span className="text-sm">{c.email}</span>
                  <button
                    onClick={() => removeCohost(c.id)}
                    className="text-xs font-semibold text-ink/40 hover:text-rose"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addCohost} className="mt-4 flex gap-2">
            <input
              type="email"
              required
              value={cohostEmail}
              onChange={(e) => setCohostEmail(e.target.value)}
              placeholder="cohost@example.com"
              className="input flex-1"
            />
            <button disabled={cohostBusy} className="btn-secondary">
              {cohostBusy ? "Adding…" : "Add co-host"}
            </button>
          </form>
          {cohostError && <p className="mt-2 text-sm text-rose">{cohostError}</p>}
        </div>
      )}

      <EventPageDetailsEditor event={event} />

      <div className="mt-10">
        <h2 className="font-display text-xl">Registration form</h2>
        <p className="mt-1 text-sm text-ink/50">
          Everyone always gives their name and email. Add more questions here —
          short answer, paragraph, multiple choice, or checkbox.
        </p>
        <div className="mt-4">
          <CustomFieldsBuilder fields={customFields} onChange={setCustomFields} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveCustomFields} disabled={formBusy} className="btn-primary">
            {formBusy ? "Saving…" : "Save form"}
          </button>
          {formSaved && <span className="text-sm text-cord">Saved ✓</span>}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl">Branding &amp; certificates</h2>
        <p className="mt-1 text-sm text-ink/50">
          Add a logo for the ticket, and optionally issue certificates to attendees.
        </p>

        <div className="mt-4 max-w-sm">
          <ImageUploader
            value={logoUrl}
            onChange={setLogoUrl}
            label="Event logo (optional)"
            helpText="Square image works best"
            previewClassName="h-20 w-20 rounded-lg object-cover"
            boxClassName="h-20 w-20"
          />
        </div>

        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium">Certificates</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "off", label: "Off" },
                { value: "participation", label: "Participation" },
                { value: "attendance", label: "Attendance (checked-in only)" },
              ] as { value: CertificateMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCertificateMode(opt.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  certificateMode === opt.value
                    ? "border-cord bg-cord/10 text-cord"
                    : "border-ink/15 text-ink/60 hover:border-ink/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {certificateMode !== "off" && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Signer 1 (required)</p>
              <input
                value={signer1Name}
                onChange={(e) => setSigner1Name(e.target.value)}
                placeholder="Full name"
                className="input mt-2"
              />
              <input
                value={signer1Title}
                onChange={(e) => setSigner1Title(e.target.value)}
                placeholder="Title, e.g. Event Director"
                className="input mt-2"
              />
              <div className="mt-2 max-w-xs">
                <ImageUploader
                  value={signer1SignatureUrl}
                  onChange={setSigner1SignatureUrl}
                  label="Signature image"
                  helpText="Transparent PNG works best"
                  previewClassName="h-16 w-full rounded-lg bg-white object-contain p-2"
                  boxClassName="h-16 w-full"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">Signer 2 (optional)</p>
              <input
                value={signer2Name}
                onChange={(e) => setSigner2Name(e.target.value)}
                placeholder="Full name"
                className="input mt-2"
              />
              <input
                value={signer2Title}
                onChange={(e) => setSigner2Title(e.target.value)}
                placeholder="Title"
                className="input mt-2"
              />
              <div className="mt-2 max-w-xs">
                <ImageUploader
                  value={signer2SignatureUrl}
                  onChange={setSigner2SignatureUrl}
                  label="Signature image"
                  helpText="Transparent PNG works best"
                  previewClassName="h-16 w-full rounded-lg bg-white object-contain p-2"
                  boxClassName="h-16 w-full"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button onClick={saveBranding} disabled={brandingBusy} className="btn-primary">
            {brandingBusy ? "Saving…" : "Save branding"}
          </button>
          {brandingSaved && <span className="text-sm text-cord">Saved ✓</span>}
        </div>
        {brandingError && <p className="mt-2 text-sm text-rose">{brandingError}</p>}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl">Post-event</h2>
        <p className="mt-1 text-sm text-ink/50">
          One send, three independent pieces — pick any combination: a thank-you note, a
          photo link, and/or each attendee's certificate link. Turn off the first two and
          leave only "Certificate" on to send certificates on their own.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Photo / gallery link (optional)</label>
            <input
              value={galleryUrl}
              onChange={(e) => setGalleryUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Audience</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudience("all_confirmed")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  audience === "all_confirmed"
                    ? "border-cord bg-cord/10 text-cord"
                    : "border-ink/15 text-ink/60"
                }`}
              >
                All confirmed
              </button>
              <button
                type="button"
                onClick={() => setAudience("checked_in_only")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  audience === "checked_in_only"
                    ? "border-cord bg-cord/10 text-cord"
                    : "border-ink/15 text-ink/60"
                }`}
              >
                Checked-in only
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">Message (optional)</label>
          <textarea
            value={thankYouMessage}
            onChange={(e) => setThankYouMessage(e.target.value)}
            rows={3}
            placeholder="A personal note to include in the thank-you email..."
            className="input"
          />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium">Include in this send</label>
          <div className="flex flex-wrap gap-2">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                sendMessage ? "border-cord bg-cord/10 text-cord" : "border-ink/15 text-ink/60"
              }`}
            >
              <input
                type="checkbox"
                checked={sendMessage}
                onChange={(e) => setSendMessage(e.target.checked)}
                className="sr-only"
              />
              Thank-you message
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                sendGallery ? "border-cord bg-cord/10 text-cord" : "border-ink/15 text-ink/60"
              }`}
            >
              <input
                type="checkbox"
                checked={sendGallery}
                onChange={(e) => setSendGallery(e.target.checked)}
                className="sr-only"
              />
              Photo link
            </label>
            {event.certificate_mode !== "off" && (
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  sendCertificate ? "border-cord bg-cord/10 text-cord" : "border-ink/15 text-ink/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sendCertificate}
                  onChange={(e) => setSendCertificate(e.target.checked)}
                  className="sr-only"
                />
                Certificate (only to those eligible now)
              </label>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={sendThankYous} disabled={thankYouBusy} className="btn-primary">
            {thankYouBusy ? "Sending…" : "Send emails"}
          </button>
          {thankYouResult && <span className="text-sm text-ink/60">{thankYouResult}</span>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white px-5 py-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
