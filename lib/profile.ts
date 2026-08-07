import { currentUser } from "@clerk/nextjs/server";
import { sql } from "./db";

// Clerk owns the "real" user record; we just mirror the minimum we need
// (id, email, name) into our own `profiles` table the first time we see
// a signed-in user, so `events.organizer_id` can reference something.
// Cheap to call on every dashboard load — it's a single upsert.
export async function ensureProfile() {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? null;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  await sql`
    insert into profiles (id, email, full_name, onboarded)
    values (${user.id}, ${email}, ${fullName}, true)
    on conflict (id) do update
      set email = excluded.email,
          full_name = excluded.full_name
  `;

  return user.id;
}
