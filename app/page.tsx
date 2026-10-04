import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="font-display text-xl font-semibold tracking-tight">
          Hey<span className="text-stub-500">Ticket</span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <a
            href="https://buymeacoffee.com/ahamedjishfaan"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring hidden items-center gap-2 rounded-full bg-[#FFDD00] px-4 py-2 font-semibold text-ink shadow-sm transition hover:bg-[#FFE94D] sm:inline-flex"
          >
            <span aria-hidden>☕</span> Buy me a coffee
          </a>
          <Link href="/sign-in" className="focus-ring rounded px-3 py-2 hover:text-stub-600">
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="focus-ring rounded-full bg-ink px-4 py-2 text-paper hover:bg-stub-600"
          >
            Start an event
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-28">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-stub-600">
            Admit one
          </p>
          <h1 className="font-display text-5xl italic leading-[1.05] tracking-tight md:text-6xl">
            Throw the event.
            <br />
            <span className="not-italic">We'll mind the door.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/70">
            Publish an event page, issue QR tickets automatically, remind
            everyone before doors open, and scan people in from your phone.
            One tool, start to finish.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-up"
              className="focus-ring rounded-full bg-stub-500 px-6 py-3 font-semibold text-ink hover:bg-stub-400"
            >
              Create your first event
            </Link>
            <span className="text-sm text-ink/50">Free · no card required</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <TicketStub />
        </div>
      </section>

      <section className="border-t border-ink/10 bg-ink px-6 py-20 text-paper md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-stub-400">
            The full run of show
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl italic md:text-4xl">
            Everything an organizer touches, in one place.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="border-t border-paper/20 pt-5">
                <h3 className="font-display text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-paper/60">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-sm text-ink/40 md:px-12">
  <p>
    Hey Ticket — built for people who'd rather be running the event than
    running a spreadsheet.
  </p>
  <a
    href="https://buymeacoffee.com/ahamedjishfaan"
    target="_blank"
    rel="noopener noreferrer"
    className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-[#FFDD00] px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-[#FFE94D]"
  >
    <span aria-hidden>☕</span> Buy me a coffee
  </a>
  <p className="mt-4 text-xs text-ink/30">A Beingtechy project</p>
</footer>
    </main>
  );
}

const features = [
  {
    title: "Event pages",
    body: "A clean public page with date, location, and a one-tap RSVP — shareable in seconds.",
  },
  {
    title: "QR tickets",
    body: "Every registration generates a unique ticket code and scannable QR, emailed automatically.",
  },
  {
    title: "Door scanning",
    body: "Open the check-in scanner on any phone camera and mark attendance in real time.",
  },
  {
    title: "Reminders",
    body: "Automatic reminder emails go out ahead of your event so no-shows go down.",
  },
  {
    title: "Attendee list",
    body: "See who's registered, who's waitlisted, and who's actually walked in, live.",
  },
  {
    title: "Simple onboarding",
    body: "Sign up, verify your email, and publish your first event in under two minutes.",
  },
];

function TicketStub() {
  return (
    <div className="perf-edge rotate-[-2deg] rounded-2xl bg-ink p-6 pb-10 text-paper shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stub-400">
            General admission
          </p>
          <h3 className="mt-1 font-display text-2xl italic">Founders' Night</h3>
          <p className="mt-1 text-sm text-paper/60">Sat, Sep 12 · 7:00 PM</p>
        </div>
        <div className="rounded-md bg-paper/10 px-2 py-1 font-mono text-[11px]">
          HT-7K2QX9
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-dashed border-paper/25 pt-6">
        <div className="text-xs text-paper/50">
          Scan at the door
          <br />
          for entry
        </div>
        <div className="grid h-20 w-20 grid-cols-5 grid-rows-5 gap-[2px] rounded bg-paper p-2">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className={i % 3 === 0 || i % 7 === 0 ? "bg-ink" : "bg-transparent"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
