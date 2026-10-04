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
      id: String(f.id || Math.random().toString(36).slice(2)),
      label: f.label.trim(),
      type: f.type,
      required: Boolean(f.required),
      options:
        f.type === "select"
          ? (Array.isArray(f.options) ? f.options : []).map(String).filter(Boolean)
          : undefined,
    }));
}
