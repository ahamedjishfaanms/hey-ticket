import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { getManageableEvent } from "@/lib/access";
import type { EventCollaboratorRow, RegistrationRow } from "@/lib/types";
import EventManageClient from "./EventManageClient";

export default async function ManageEventPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  const event = await getManageableEvent(params.id, userId);
  if (!event) notFound();

  const registrations = (await sql`
    select * from registrations where event_id = ${params.id} order by created_at desc
  `) as RegistrationRow[];

  const collaborators = (await sql`
    select * from event_collaborators where event_id = ${params.id} order by created_at asc
  `) as EventCollaboratorRow[];

  return (
    <EventManageClient
      event={event}
      role={event.role}
      initialRegistrations={registrations}
      initialCollaborators={collaborators}
    />
  );
}
