import type { AgendaItem, FaqItem, SpeakerItem } from "./types";

// Keep only well-formed rows and cap sizes, so a bad payload can't
// break the public page or bloat the row.
function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function rid(v: unknown) {
  return typeof v === "string" && v ? v.slice(0, 40) : Math.random().toString(36).slice(2, 10);
}
function isHttpUrl(v: string) {
  return /^https:\/\//i.test(v);
}

export function sanitizeAgenda(input: unknown): AgendaItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((a) => ({ id: rid(a?.id), time: str(a?.time, 40), title: str(a?.title, 200) }))
    .filter((a) => a.title)
    .slice(0, 40);
}

export function sanitizeSpeakers(input: unknown): SpeakerItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => {
      const photo = str(s?.photo_url, 500);
      return {
        id: rid(s?.id),
        name: str(s?.name, 120),
        role: str(s?.role, 160),
        photo_url: isHttpUrl(photo) ? photo : "",
      };
    })
    .filter((s) => s.name)
    .slice(0, 30);
}

export function sanitizeFaqs(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((f) => ({ id: rid(f?.id), question: str(f?.question, 300), answer: str(f?.answer, 2000) }))
    .filter((f) => f.question && f.answer)
    .slice(0, 30);
}
