import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import type { EventRow } from "@/lib/types";
import CheckinClient from "./CheckinClient";

export default async function CheckinPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  const [event] = (await sql`
    select * from events where id = ${params.id} and organizer_id = ${userId}
  `) as EventRow[];

  if (!event) notFound();

  return <CheckinClient event={event} />;
}
