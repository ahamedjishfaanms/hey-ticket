"use client";

import { useEffect, useRef, useState } from "react";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
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

function fromValue(value: string): Date {
  if (!value) {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return d;
  }
  const [datePart, timePart] = value.split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  const [h, min] = (timePart || "00:00").split(":").map(Number);
  return new Date(y, (m || 1) - 1, day || 1, h || 0, min || 0);
}

function formatDisplay(value: string) {
  if (!value) return null;
  const d = fromValue(value);
  const datePart = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromValue(value) : null;
  const [viewMonth, setViewMonth] = useState(() => (selected || new Date()).getMonth());
  const [viewYear, setViewYear] = useState(() => (selected || new Date()).getFullYear());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function commitDate(day: number) {
    const base = selected || fromValue("");
    const next = new Date(viewYear, viewMonth, day, base.getHours(), base.getMinutes());
    onChange(toValue(next));
  }

  function commitTime(hour: number, minute: number) {
    const base = selected || new Date(viewYear, viewMonth, 1);
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute);
    onChange(toValue(next));
  }

  function setQuickDate(daysFromToday: number) {
    const base = selected || new Date();
    const next = new Date();
    next.setDate(next.getDate() + daysFromToday);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
    onChange(toValue(next));
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const hour24 = selected ? selected.getHours() : 9;
  const minute = selected ? selected.getMinutes() : 0;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const isPm = hour24 >= 12;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex w-full items-center justify-between text-left"
      >
        <span className={value ? "" : "text-ink/40"}>{formatDisplay(value) || placeholder}</span>
        <span className="text-ink/30">📅</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-80 rounded-xl border border-ink/10 bg-white p-4 shadow-xl">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-stub-400"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-stub-400"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-stub-400"
            >
              Next week
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                viewMonth === 0
                  ? (setViewMonth(11), setViewYear((y) => y - 1))
                  : setViewMonth((m) => m - 1)
              }
              className="rounded-full px-2 py-1 text-ink/50 hover:bg-stub-50"
            >
              ‹
            </button>
            <p className="text-sm font-semibold">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={() =>
                viewMonth === 11
                  ? (setViewMonth(0), setViewYear((y) => y + 1))
                  : setViewMonth((m) => m + 1)
              }
              className="rounded-full px-2 py-1 text-ink/50 hover:bg-stub-50"
            >
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-[10px] font-semibold uppercase text-ink/30">
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const isSelected =
                selected &&
                selected.getFullYear() === viewYear &&
                selected.getMonth() === viewMonth &&
                selected.getDate() === day;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => commitDate(day)}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    isSelected
                      ? "bg-ink text-paper font-semibold"
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

          <div className="mt-4 flex items-center gap-2 border-t border-ink/10 pt-3">
            <select
              value={hour12}
              onChange={(e) => {
                const h = Number(e.target.value) % 12;
                commitTime(isPm ? h + 12 : h, minute);
              }}
              className="input !py-1.5 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-ink/40">:</span>
            <select
              value={minute}
              onChange={(e) => commitTime(hour24, Number(e.target.value))}
              className="input !py-1.5 text-sm"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
            <div className="ml-1 flex overflow-hidden rounded-lg border border-ink/15">
              <button
                type="button"
                onClick={() => commitTime(hour12 % 12, minute)}
                className={`px-2.5 py-1.5 text-xs font-semibold ${
                  !isPm ? "bg-ink text-paper" : "text-ink/50"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => commitTime((hour12 % 12) + 12, minute)}
                className={`px-2.5 py-1.5 text-xs font-semibold ${
                  isPm ? "bg-ink text-paper" : "text-ink/50"
                }`}
              >
                PM
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
