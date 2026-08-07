import { neon } from "@neondatabase/serverless";

// Tagged-template SQL client. Usage: await sql`select * from events where id = ${id}`
// Values are automatically parameterized — never string-interpolate user
// input directly into a query.
export const sql = neon(process.env.DATABASE_URL!);
