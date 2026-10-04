import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getAdminUserId } from "@/lib/admin";
import { getDict, type Lang } from "@/lib/eventPageI18n";
import type { EventRow } from "@/lib/types";
import RegisterForm from "./RegisterForm";
import {
  ContactOrganizer,
  Countdown,
  LocalDateTime,
  ReadMore,
  ReportEvent,
  ShareButtons,
  StickyCta,
} from "./EventClientBits";

// Publish status, moderation and capacity can change at any moment, so
// this page must never be served from a stale cache.
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Deduped between generateMetadata and the page render.
const getPublicEvent = cache(async (slug: string) => {
  const [event] = (await sql`
    select * from events
    where slug = ${slug} and is_published = true and moderation_status = 'active'
  `) as EventRow[];
  return event ?? null;
});

function eventEnd(e: EventRow) {
  return e.ends_at
    ? new Date(e.ends_at)
    : new Date(new Date(e.starts_at).getTime() + 3 * 60 * 60 * 1000);
}

/* ---------------- Link preview (WhatsApp, iMessage, LinkedIn, X…) ---------------- */

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const event = await getPublicEvent(params.slug);
  if (!event) return { title: "Event · Hey Ticket", robots: { index: false } };

  const when = new Date(event.starts_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
    timeZoneName: "short",
  });
  const where = event.is_online ? "Online" : event.location || "";
  const summary = [when, where].filter(Boolean).join(" · ");
  const description = event.description
    ? `${summary} — ${event.description.replace(/\s+/g, " ").slice(0, 150)}`
    : summary;
  const url = `${APP_URL}/e/${event.slug}`;
  const images = event.cover_image_url
    ? [{ url: event.cover_image_url, width: 1200, height: 630, alt: event.title }]
    : undefined;

  return {
    metadataBase: new URL(APP_URL),
    title: `${event.title} · Hey Ticket`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Hey Ticket",
      title: event.title,
      description,
      url,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: event.title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

/* ---------------- Page ---------------- */

export default async function PublicEventPage({
  params,
}: {
  params: { slug: string };
}) {
  let event = await getPublicEvent(params.slug);
  let adminPreview = false;

  // Platform admins can open unpublished/suspended events for review.
  if (!event) {
    const adminId = await getAdminUserId().catch(() => null);
    if (adminId) {
      const [row] = (await sql`select * from events where slug = ${params.slug}`) as EventRow[];
      if (row) {
        event = row;
        adminPreview = true;
      }
    }
  }
  if (!event) notFound();

  const lang: Lang = "en";
  const t = getDict(lang);

  const [[{ count: confirmedCount }], recent, [organizer], pastEvents] = await Promise.all([
    sql`
      select count(*)::int as count from registrations
      where event_id = ${event.id} and status = 'confirmed'
    ` as unknown as Promise<{ count: number }[]>,
    sql`
      select full_name from registrations
      where event_id = ${event.id} and status = 'confirmed'
      order by created_at desc limit 5
    ` as unknown as Promise<{ full_name: string }[]>,
    sql`select full_name from profiles where id = ${event.organizer_id}` as unknown as Promise<
      { full_name: string | null }[]
    >,
    sql`
      select e.slug, e.title, e.starts_at, e.cover_image_url, e.timezone,
        (select count(*)::int from registrations r
          where r.event_id = e.id and r.status = 'confirmed') as going
      from events e
      where e.organizer_id = ${event.organizer_id}
        and e.id <> ${event.id}
        and e.is_published = true and e.moderation_status = 'active'
        and e.starts_at < now()
      order by e.starts_at desc limit 3
    ` as unknown as Promise<
      { slug: string; title: string; starts_at: string; cover_image_url: string | null; timezone: string; going: number }[]
    >,
  ]);

  const now = new Date();
  const ended = eventEnd(event) < now;
  const isFull = event.capacity != null && confirmedCount >= event.capacity;
  const spotsLeft = event.capacity != null ? Math.max(0, event.capacity - confirmedCount) : null;
  const firstNames = recent.map((r) => r.full_name.trim().split(/\s+/)[0]).filter(Boolean);
  const hostName = organizer?.full_name || "The organizer";
  const shareUrl = `${APP_URL}/e/${event.slug}`;
  const mapsQuery = event.location ? encodeURIComponent(event.location) : "";

  const ctaLabel = ended
    ? t.eventEnded
    : isFull
    ? t.joinWaitlist
    : event.require_approval
    ? t.requestToJoin
    : t.getTicket;

  const availability = isFull
    ? t.soldOut
    : spotsLeft != null
    ? t.spotsLeft(spotsLeft)
    : confirmedCount > 0
    ? t.going(confirmedCount)
    : t.beFirst;

  return (
    <main
      className="event-page min-h-screen bg-paper pb-28 text-ink dark:bg-[#101116] dark:text-paper md:pb-16"
    >
      {/* Top bar */}
      <nav className="mx-auto flex max-w-5xl items-center px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-semibold">
          Hey<span className="text-stub-500">Ticket</span>
        </Link>
      </nav>

      {adminPreview && (
        <div className="mx-auto mb-4 max-w-5xl px-4 sm:px-6">
          <p className="rounded-lg bg-rose/10 px-4 py-2 text-sm font-semibold text-rose">
            {t.previewBanner}
            {event.moderation_status === "suspended" && event.moderation_note
              ? ` (${event.moderation_note})`
              : ""}
          </p>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_360px] md:gap-12">
        {/* ============ 1. HERO ============ */}
        <header className="md:col-start-1">
          <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl">
            {event.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image_url}
                alt=""
                fetchPriority="high"
                decoding="async"
                className="aspect-[2/1] w-full bg-stub-100 object-cover"
              />
            ) : (
              <div className="flex aspect-[2/1] w-full items-end bg-gradient-to-br from-stub-400 via-stub-500 to-rose p-6">
                <span className="font-display text-6xl italic text-white/90" dir="auto">
                  {event.title.slice(0, 1)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Countdown startsAt={event.starts_at} endsAt={event.ends_at} lang={lang} />
            <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/60 dark:bg-white/10 dark:text-paper/60">
              {event.is_online ? t.online : t.inPerson}
            </span>
          </div>

          <h1
            dir="auto"
            className="mt-3 font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl"
          >
            {event.title}
          </h1>

          <div className="mt-6 space-y-4">
            <InfoRow icon={<CalendarIcon />}>
              <LocalDateTime
                startsAt={event.starts_at}
                endsAt={event.ends_at}
                eventTz={event.timezone}
                lang={lang}
              />
            </InfoRow>

            <InfoRow icon={event.is_online ? <GlobeIcon /> : <PinIcon />}>
              {event.is_online ? (
                <p className="font-semibold">{t.onlineVia}</p>
              ) : event.location ? (
                <div>
                  <p className="font-semibold" dir="auto">
                    {event.location}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-stub-600 hover:underline dark:text-stub-400"
                  >
                    {t.openInMaps} ↗
                  </a>
                </div>
              ) : (
                <p className="font-semibold">{t.inPerson}</p>
              )}
            </InfoRow>

            <InfoRow icon={<TicketIcon />}>
              <p className="font-semibold">
                {t.free}
                <span
                  className={`ms-2 text-sm font-semibold ${
                    isFull || (spotsLeft != null && spotsLeft <= 10)
                      ? "text-rose"
                      : "text-ink/50 dark:text-paper/50"
                  }`}
                >
                  · {availability}
                </span>
              </p>
            </InfoRow>
          </div>

          {firstNames.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <div className="flex -space-x-2">
                {firstNames.map((n, i) => (
                  <Avatar key={i} name={n} />
                ))}
              </div>
              <p className="text-sm text-ink/60 dark:text-paper/60" dir="auto">
                {t.goingNames(firstNames.slice(0, 2), confirmedCount - Math.min(2, firstNames.length))}
              </p>
            </div>
          )}
        </header>

        {/* ============ REGISTRATION CARD ============ */}
        <aside className="md:col-start-2 md:row-span-2 md:row-start-1">
          <div
            id="register"
            className="scroll-mt-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a1c23] md:sticky md:top-6"
          >
            {ended ? (
              <div className="text-center">
                <p className="text-3xl">📸</p>
                <p className="mt-2 font-display text-xl">{t.eventEnded}</p>
                {event.gallery_url && (
                  <a
                    href={event.gallery_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-5 block w-full"
                  >
                    {t.seePhotos}
                  </a>
                )}
              </div>
            ) : adminPreview ? (
              <p className="text-center text-sm text-ink/50">{t.previewBanner}</p>
            ) : (
              <RegisterForm
                eventId={event.id}
                isFull={isFull}
                requiresApproval={event.require_approval}
                customFields={event.custom_fields || []}
                lang={lang}
                priceLabel={t.free}
                shareUrl={shareUrl}
                calendarEvent={{
                  title: event.title,
                  description: event.description || undefined,
                  location: event.is_online ? shareUrl : event.location || undefined,
                  startsAt: event.starts_at,
                  endsAt: event.ends_at,
                  url: shareUrl,
                }}
              />
            )}
          </div>
          <div className="mt-4 hidden md:block">
            <ShareButtons url={shareUrl} title={event.title} lang={lang} />
          </div>
        </aside>

        {/* ============ DETAILS + TRUST ============ */}
        <div className="space-y-12 md:col-start-1">
          {event.description && (
            <Section title={t.about}>
              <ReadMore text={event.description} lang={lang} />
            </Section>
          )}

          {event.agenda?.length > 0 && (
            <Section title={t.agenda}>
              <ol className="relative space-y-4 border-s-2 border-stub-100 ps-5 dark:border-white/10">
                {event.agenda.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -start-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-stub-500 dark:border-[#101116]" />
                    {a.time && (
                      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-stub-600 dark:text-stub-400">
                        {a.time}
                      </p>
                    )}
                    <p className="font-medium" dir="auto">
                      {a.title}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {event.speakers?.length > 0 && (
            <Section title={t.speakers}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {event.speakers.map((s) => (
                  <div key={s.id} className="text-center">
                    {s.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photo_url}
                        alt={s.name}
                        loading="lazy"
                        className="mx-auto h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar name={s.name} size="lg" />
                    )}
                    <p className="mt-2 font-semibold" dir="auto">
                      {s.name}
                    </p>
                    {s.role && (
                      <p className="text-sm text-ink/50 dark:text-paper/50" dir="auto">
                        {s.role}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!event.is_online && event.location && (
            <Section title={t.location}>
              <div className="overflow-hidden rounded-2xl border border-ink/10 dark:border-white/10">
                <iframe
                  title={t.location}
                  src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-64 w-full border-0"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium" dir="auto">
                  {event.location}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm dark:border-white/15 dark:text-paper"
                >
                  {t.getDirections} ↗
                </a>
              </div>
              {event.venue_notes && (
                <div className="mt-4 rounded-xl bg-stub-50 p-4 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stub-600 dark:text-stub-400">
                    {t.directions}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink/75 dark:text-paper/75" dir="auto">
                    {event.venue_notes}
                  </p>
                </div>
              )}
            </Section>
          )}

          {/* Trust: organizer */}
          <Section title={t.hostedBy}>
            <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1c23]">
              <div className="flex flex-wrap items-center gap-4">
                {event.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.logo_url}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <Avatar name={hostName} size="lg" square />
                )}
                <p className="min-w-0 flex-1 font-display text-xl" dir="auto">
                  {hostName}
                </p>
                {!adminPreview && <ContactOrganizer eventId={event.id} lang={lang} />}
              </div>

              {pastEvents.length > 0 && (
                <div className="mt-5 border-t border-ink/10 pt-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/40">
                    {t.pastEvents}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {pastEvents.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/e/${p.slug}`}
                          className="flex items-center gap-3 rounded-lg p-1 hover:bg-ink/5 dark:hover:bg-white/5"
                        >
                          {p.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.cover_image_url}
                              alt=""
                              loading="lazy"
                              className="h-10 w-14 rounded-md object-cover"
                            />
                          ) : (
                            <span className="h-10 w-14 rounded-md bg-stub-100 dark:bg-white/10" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold" dir="auto">
                              {p.title}
                            </span>
                            <span className="block text-xs text-ink/50 dark:text-paper/50">
                              {new Date(p.starts_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                timeZone: p.timezone,
                              })}
                              {p.going > 0 ? ` · ${t.going(p.going)}` : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          {event.faqs?.length > 0 && (
            <Section title={t.faq}>
              <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#1a1c23]">
                {event.faqs.map((f) => (
                  <details key={f.id} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                      <span dir="auto">{f.question}</span>
                      <span className="text-xl leading-none text-ink/40 transition-transform group-open:rotate-45 dark:text-paper/40">
                        +
                      </span>
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/70 dark:text-paper/70" dir="auto">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </Section>
          )}

          <div className="md:hidden">
            <ShareButtons url={shareUrl} title={event.title} lang={lang} />
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-6 dark:border-white/10">
            {!adminPreview ? <ReportEvent eventId={event.id} lang={lang} /> : <span />}
            <Link href="/" className="text-xs text-ink/40 hover:text-ink dark:text-paper/40">
              Powered by Hey<span className="text-stub-500">Ticket</span>
            </Link>
          </footer>
        </div>
      </div>

      {/* ============ 2. STICKY MOBILE CTA ============ */}
      {!adminPreview && (
        <StickyCta
          label={ctaLabel}
          priceLabel={ended ? t.eventEnded : t.free}
          subLabel={ended ? undefined : availability}
          disabled={ended}
        />
      )}
    </main>
  );
}

/* ---------------- Small server components ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink/70 dark:border-white/10 dark:bg-[#1a1c23] dark:text-paper/70">
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">{children}</div>
    </div>
  );
}

const AVATAR_COLORS = ["#EF8B0C", "#3B6E5C", "#D64550", "#5B5BD6", "#0E7C86", "#B5651D"];

function Avatar({ name, size = "sm", square }: { name: string; size?: "sm" | "lg"; square?: boolean }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bg = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  const dims = size === "lg" ? "h-14 w-14 text-xl" : "h-8 w-8 text-xs";
  return (
    <span
      className={`inline-flex ${dims} ${square ? "rounded-xl" : "rounded-full"} items-center justify-center border-2 border-paper font-bold text-white dark:border-[#101116] ${size === "lg" && !square ? "mx-auto" : ""}`}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8z" />
      <path d="M13 6v2M13 11v2M13 16v2" />
    </svg>
  );
}
