import { neon } from "@neondatabase/serverless";

// Tagged-template SQL client. Usage: await sql`select * from events where id = ${id}`
// Values are automatically parameterized — never string-interpolate user
// input directly into a query.
//
// The Neon HTTP driver runs every query through fetch(), and Next.js 14
// caches fetch() results by default. Without `cache: "no-store"` a page
// can keep showing an old snapshot of a row — e.g. an unpublished event
// still loading, a stale "1 spot left", or newly saved FAQ/agenda not
// appearing. Database reads must always be fresh.
export const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { cache: "no-store" },
});
