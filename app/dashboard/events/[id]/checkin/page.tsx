import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getManageableEvent } from "@/lib/access";
import CheckinClient from "./CheckinClient";

export default async function CheckinPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  const event = await getManageableEvent(params.id, userId);
  if (!event) notFound();

  return <CheckinClient event={event} />;
}
