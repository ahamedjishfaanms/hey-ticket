"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";

export default function SignOutButton() {
  return (
    <ClerkSignOutButton redirectUrl="/">
      <button className="focus-ring text-sm font-medium text-ink/60 hover:text-ink">
        Sign out
      </button>
    </ClerkSignOutButton>
  );
}
