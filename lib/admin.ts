import { currentUser } from "@clerk/nextjs/server";
import { adminEmailList } from "./moderation";

// Returns the signed-in user's id if they're a platform admin, else null.
// Only a *verified* email address counts — otherwise anyone could sign up
// with an admin's address and get in before proving they own it.
export async function getAdminUserId(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const admins = new Set(adminEmailList());
  const isAdmin = user.emailAddresses.some(
    (e) =>
      e.verification?.status === "verified" && admins.has(e.emailAddress.toLowerCase())
  );
  return isAdmin ? user.id : null;
}
