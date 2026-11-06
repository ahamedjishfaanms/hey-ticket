import type { CustomFieldDef } from "./types";

// Keeps only well-formed field definitions — a malformed one (no label,
// unknown type) is silently dropped rather than breaking the save.
export function sanitizeCustomFields(input: unknown): CustomFieldDef[] {
  if (!Array.isArray(input)) return [];
  const validTypes = new Set(["text", "textarea", "select", "checkbox"]);
  return input
    .filter(
      (f): f is CustomFieldDef =>
        f && typeof f.label === "string" && f.label.trim() && validTypes.has(f.type)
    )
    .map((f) => ({
      id: String(f.id || Math.random().toString(36).slice(2)).slice(0, 40),
      label: f.label.trim().slice(0, 200),
      type: f.type,
      required: Boolean(f.required),
      // Trim, drop blanks, and de-duplicate case-insensitively so
      // "Vegan, Vegan, , Halal" becomes ["Vegan", "Halal"].
      options:
        f.type === "select"
          ? Array.from(
              new Map(
                (Array.isArray(f.options) ? f.options : [])
                  .map((o) => String(o).trim().slice(0, 100))
                  .filter(Boolean)
                  .map((o) => [o.toLowerCase(), o] as const)
              ).values()
            ).slice(0, 50)
          : undefined,
    }))
    // A multiple-choice question with no options can't be answered.
    .filter((f) => f.type !== "select" || (f.options && f.options.length > 0))
    .slice(0, 30);
}
