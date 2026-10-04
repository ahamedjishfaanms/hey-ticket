// Shared, client-safe moderation constants.

export const REPORT_REASONS = [
  "Illegal activity",
  "Scam or fraud",
  "Violence or hate",
  "Adult or sexual content",
  "Spam or misleading",
  "Other",
] as const;

// Platform admins. Configure extra admins with a comma-separated
// ADMIN_EMAILS env var; the founder's address is always included so
// access can't be lost to a missing variable. Server-only usage.
const DEFAULT_ADMINS = ["ahamedjishfaan@gmail.com"];

export function adminEmailList(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMINS, ...fromEnv]));
}
