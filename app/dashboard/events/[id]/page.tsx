import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import type { EventRow, RegistrationRow } from "@/lib/types";
import EventManageClient from "./EventManageClient";

export default async function ManageEventPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  const [event] = (await sql`
    select * from events where id = ${params.id} and organizer_id = ${userId}
  `) as EventRow[];

  if (!event) notFound();

  const registrations = (await sql`
    select * from registrations where event_id = ${params.id} order by created_at desc
  `) as RegistrationRow[];

  return <EventManageClient event={event} initialRegistrations={registrations} />;
}
