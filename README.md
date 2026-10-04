# Hey Ticket 🎟️

A Luma-style event management platform: create an event, publish a page,
collect registrations, issue QR tickets by email, send reminders
automatically, and check people in at the door with a camera scan.

**Stack:** Next.js 14 (App Router, TypeScript) · Neon (serverless Postgres)
· Clerk (auth) · Resend (email) · Tailwind CSS · deployed on Vercel.

> This version replaces Supabase with **Neon + Clerk** — same core app,
> different backend, because Supabase's free tier caps you at 2 projects.
> Neon and Clerk each have generous free tiers with no project-count trap.

## What's included

- **Onboarding** — Clerk-hosted sign up / sign in (email, or add Google/GitHub in one click from the Clerk dashboard)
- **Event creation & management** — draft/publish toggle, shareable public link, capacity + waitlisting
- **Public event page** — clean RSVP page at `/e/your-event-slug`
- **Ticketing** — every registration gets a unique code and a scannable QR ticket at `/ticket/[id]`
- **Confirmation & reminder emails** — sent via Resend, reminder timing configurable per event, delivered by an hourly Vercel Cron job
- **Attendance / check-in** — camera-based QR scanner (or manual code entry) at `/dashboard/events/[id]/checkin`, live attendee list, CSV export

- **Public event page** — cover, date in the visitor's own timezone, Google Maps link, spots left / who's going, countdown, sticky mobile "Get ticket" bar, one-step registration with instant QR + Add to Calendar + share, agenda, speakers, map, FAQ, organizer card, dark mode, Arabic (`?lang=ar`, or automatic from the browser language)
- **Admin moderation** — `/admin` lists every event from every organizer; suspend illegal/unsafe events (hidden, registration closed, organizer emailed), restore them, and review public "Report this event" flags

## 1. Create the Neon database

1. Go to [neon.tech](https://neon.tech) → sign up free (no card) → **Create a project**.
2. Once it's ready, open the **SQL Editor** in the Neon console, paste in
   the entire contents of [`db/schema.sql`](./db/schema.sql), and run it.
   This creates the `profiles`, `events`, and `registrations` tables plus
   an attendance summary view.
3. Go to your project's **Connection Details** and copy the **pooled
   connection string** (recommended for serverless — it looks like
   `postgres://user:pass@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`)
   → this is your `DATABASE_URL`.

## 2. Create the Clerk app

1. Go to [clerk.com](https://clerk.com) → sign up free (no card) → **Create application**.
2. Enable **Email** as a sign-in method (Google/GitHub optional, one click each).
3. Go to **API Keys** and copy:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`
4. The routing env vars (`NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc.) are already
   set correctly in `.env.example` to match this app's `/sign-in` and
   `/sign-up` pages — no changes needed there.

## 3. Set up email (Resend)

1. Sign up free at [resend.com](https://resend.com).
2. Add and verify a sending domain (or use their test domain while developing).
3. Create an API key → `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to something like `HeyTicket <tickets@yourdomain.com>`.

## 4. Run it locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local with the values from steps 1–3
npm run dev
```

Open http://localhost:3000, sign up, create an event, publish it, and test
the registration + ticket + check-in flow end to end.

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Hey Ticket (Neon + Clerk)"
gh repo create hey-ticket --private --source=. --push
# or manually: create a repo on github.com, then
git remote add origin https://github.com/YOUR-USERNAME/hey-ticket.git
git branch -M main
git push -u origin main
```

## 6. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Under **Environment Variables**, add everything from `.env.example`:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
   - `NEXT_PUBLIC_APP_URL` → set this to your Vercel URL, e.g. `https://hey-ticket.vercel.app`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `CRON_SECRET` → invent a long random string
3. Deploy.
4. Vercel automatically reads `vercel.json` and schedules `/api/reminders`
   to run hourly, sending it your `CRON_SECRET` as a Bearer token — no
   extra setup needed.
5. Back in the Clerk dashboard, under **Domains**, add your production
   Vercel URL so Clerk allows auth from it.

## Upgrading an existing database

Run each migration in `db/` in order in the Neon SQL editor. The latest,
`migration_005_admin_and_event_page.sql`, adds moderation, event reports,
and the agenda / speakers / FAQ / venue-notes fields — **run it before
deploying this version**, since the public page and registration now
read those columns.

## Admin access

Anyone whose **verified** Clerk email is `ahamedjishfaan@gmail.com`, or is
listed in the `ADMIN_EMAILS` env var (comma-separated), sees an **Admin**
button in the dashboard and can open `/admin`. Everyone else gets a 404.

## How the pieces fit together

- **Auth** is entirely Clerk's — no custom login forms, no password
  handling in this codebase at all. `middleware.ts` protects everything
  under `/dashboard`.
- **Profiles**: Clerk owns the real user record; the first time a signed-in
  user hits the dashboard, `lib/profile.ts` upserts a minimal mirror row
  into our own `profiles` table (keyed by the Clerk user id) so
  `events.organizer_id` has something to reference. No webhook required.
- **Authorization**: Neon's free tier is plain Postgres with no
  per-user Row Level Security like Supabase provides, so every query that
  touches an organizer's data explicitly filters by
  `organizer_id = <clerk userId>` in the API routes / server components
  (see `app/api/events/[id]/route.ts` and `app/api/checkin/route.ts`).
- **Registration** (`/api/register`) is a public route — no auth required
  — that inserts a registration and emails a confirmation with the ticket
  link via Resend.
- **Tickets** are just a unique code (`HT-XXXXXXXXXX`) rendered as a QR
  code with the `qrcode` package — no external ticketing service needed.
- **Check-in** (`/api/checkin`) requires a signed-in Clerk session and
  verifies the event belongs to that organizer before allowing a scan.
- **Reminders** (`/api/reminders`) is a cron-protected route: Vercel Cron
  hits it hourly, it finds registrations whose event falls within the
  configured "remind X hours before" window and haven't been reminded yet,
  and sends one reminder each.
- **QR scanning** uses `html5-qrcode`, which accesses the device camera
  directly in the browser — works on any phone, no native app required.

## Extending it

Natural next additions if you want to keep building:
- Paid tickets (Stripe Checkout + a `price_cents` column on `events`)
- Multiple ticket tiers per event
- Custom event cover images (Vercel Blob or Cloudinary, since there's no Supabase Storage now)
- Team members / co-organizers per event
- Calendar (.ics) file attached to confirmation emails
