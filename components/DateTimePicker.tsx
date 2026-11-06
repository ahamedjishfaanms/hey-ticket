"use client";

import { useEffect, useRef, useState } from "react";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Parses/serializes the same "YYYY-MM-DDTHH:mm" shape a native
// <input type="datetime-local"> uses, so this drops in anywhere that
// format was already being passed around.
function toValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parse(value: string): Date | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  const [h, min] = (timePart || "00:00").split(":").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day, h || 0, min || 0);
}

function formatDisplay(value: string) {
  const d = parse(value);
  if (!d) return null;
  const datePart = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Select date & time",
  min,
  defaultDate,
  align = "left",
  clearable = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Earliest selectable moment ("YYYY-MM-DDTHH:mm"); days before it are disabled.
  min?: string;
  // Where the calendar opens when empty, and which time to start from
  // (e.g. the Ends picker starts on the chosen start date).
  defaultDate?: string;
  // Which edge the popover lines up with — "right" for a field on the
  // right-hand side so the calendar doesn't run off the screen.
  align?: "left" | "right";
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const fallback = parse(defaultDate || "") || null;
  const minDate = parse(min || "");
  const anchor = selected || fallback || new Date();
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const rootRef = useRef<HTMLDivElement>(null);

  // When the calendar opens, jump to the selected (or default) month.
  useEffect(() => {
    if (!open) return;
    const a = parse(value) || parse(defaultDate || "") || new Date();
    setViewMonth(a.getMonth());
    setViewYear(a.getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Time used when picking a day before any time was chosen. Keeps what's
  // shown in the time selects (9:00 AM, or the default date's time)
  // instead of silently switching to "now".
  const baseHour = selected ? selected.getHours() : fallback ? fallback.getHours() : 9;
  const baseMinute = selected ? selected.getMinutes() : fallback ? fallback.getMinutes() : 0;

  function clampToMin(d: Date) {
    return minDate && d < minDate ? new Date(minDate) : d;
  }

  function commitDate(day: number) {
    const next = new Date(viewYear, viewMonth, day, baseHour, baseMinute);
    onChange(toValue(clampToMin(next)));
  }

  function commitTime(hour: number, minute: number) {
    const base = selected || fallback || new Date(viewYear, viewMonth, 1);
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute);
    onChange(toValue(next));
  }

  function setQuickDate(daysFromToday: number) {
    const next = new Date();
    next.setDate(next.getDate() + daysFromToday);
    next.setHours(baseHour, baseMinute, 0, 0);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
    onChange(toValue(clampToMin(next)));
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const minDay = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
  const canGoBack = !minDay || new Date(viewYear, viewMonth, 1) > new Date(minDay.getFullYear(), minDay.getMonth(), 1);

  const today = new Date();
  const hour24 = baseHour;
  const minute = baseMinute;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const isPm = hour24 >= 12;
  const minuteOptions = [0, 15, 30, 45].includes(minute) ? [0, 15, 30, 45] : [0, 15, 30, 45, minute].sort((a, b) => a - b);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="input flex w-full items-center justify-between gap-2 text-left"
        >
          <span className={`truncate ${value ? "" : "text-ink/40"}`}>{formatDisplay(value) || placeholder}</span>
          <span className="shrink-0 text-ink/30" aria-hidden>
            📅
          </span>
        </button>
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear date"
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-sm text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date and time"
          // Never wider than the screen minus a gutter, so it can't spill
          // off the right edge on phones.
          className={`absolute z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-ink/10 bg-white p-4 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex flex-wrap gap-1.5">
            {[
              ["Today", 0],
              ["Tomorrow", 1],
              ["Next week", 7],
            ].map(([label, days]) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuickDate(days as number)}
                className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-stub-400"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoBack}
              aria-label="Previous month"
              className="rounded-full px-2 py-1 text-ink/50 hover:bg-stub-50 disabled:opacity-20"
            >
              ‹
            </button>
            <p className="text-sm font-semibold" aria-live="polite">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-full px-2 py-1 text-ink/50 hover:bg-stub-50"
            >
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-[10px] font-semibold uppercase text-ink/30" aria-hidden>
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const date = new Date(viewYear, viewMonth, day);
              const isSelected = selected ? sameDay(selected, date) : false;
              const isToday = sameDay(today, date);
              const disabled = Boolean(minDay && date < minDay);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => commitDate(day)}
                  aria-label={`${DAY_NAMES[date.getDay()]}, ${MONTH_LABELS[viewMonth]} ${day}, ${viewYear}`}
                  aria-pressed={isSelected}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    disabled
                      ? "cursor-not-allowed text-ink/20"
                      : isSelected
                      ? "bg-ink font-semibold text-paper"
                      : isToday
                      ? "border border-cord text-cord"
                      : "text-ink/70 hover:bg-stub-50"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time row wraps instead of pushing AM/PM out of the box. */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
            <select
              aria-label="Hour"
              value={hour12}
              onChange={(e) => {
                const h = Number(e.target.value) % 12;
                commitTime(isPm ? h + 12 : h, minute);
              }}
              className="input !w-auto !py-1.5 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-ink/40" aria-hidden>
              :
            </span>
            <select
              aria-label="Minute"
              value={minute}
              onChange={(e) => commitTime(hour24, Number(e.target.value))}
              className="input !w-auto !py-1.5 text-sm"
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 overflow-hidden rounded-lg border border-ink/15" role="group" aria-label="AM or PM">
              <button
                type="button"
                aria-pressed={!isPm}
                onClick={() => commitTime(hour12 % 12, minute)}
                className={`px-2.5 py-1.5 text-xs font-semibold ${!isPm ? "bg-ink text-paper" : "text-ink/50"}`}
              >
                AM
              </button>
              <button
                type="button"
                aria-pressed={isPm}
                onClick={() => commitTime((hour12 % 12) + 12, minute)}
                className={`px-2.5 py-1.5 text-xs font-semibold ${isPm ? "bg-ink text-paper" : "text-ink/50"}`}
              >
                PM
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
