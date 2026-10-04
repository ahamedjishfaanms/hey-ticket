import Link from "next/link";
import { ensureProfile } from "@/lib/profile";
import SignOutButton from "@/components/SignOutButton";
import { getAdminUserId } from "@/lib/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // middleware.ts already redirects signed-out visitors to /sign-in before
  // this layout ever renders. This just mirrors our Clerk user into our
  // own `profiles` table so events.organizer_id has something to reference.
  await ensureProfile();
  const isAdmin = Boolean(await getAdminUserId());

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4 md:px-10">
        <Link href="/dashboard" className="font-display text-lg font-semibold">
          Hey<span className="text-stub-500">Ticket</span>
        </Link>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-rose/10 px-3 py-1.5 text-sm font-semibold text-rose hover:bg-rose/15"
            >
              Admin
            </Link>
          )}
          <Link href="/dashboard/events/new" className="btn-primary text-sm">
            New event
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}
