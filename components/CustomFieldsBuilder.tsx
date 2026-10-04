"use client";

import type { CustomFieldDef, CustomFieldType } from "@/lib/types";

let counter = 0;
function newId() {
  counter += 1;
  return `f${Date.now().toString(36)}${counter}`;
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Short answer",
  textarea: "Paragraph",
  select: "Multiple choice",
  checkbox: "Checkbox",
};

export default function CustomFieldsBuilder({
  fields,
  onChange,
}: {
  fields: CustomFieldDef[];
  onChange: (fields: CustomFieldDef[]) => void;
}) {
  function addField() {
    onChange([...fields, { id: newId(), label: "", type: "text", required: false }]);
  }

  function updateField(id: string, patch: Partial<CustomFieldDef>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const i = fields.findIndex((f) => f.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      {fields.length === 0 && (
        <p className="text-sm text-ink/50">
          No extra questions yet — attendees will just give their name and email.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="rounded-xl border border-ink/10 bg-white p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Question, e.g. Company name"
                  className="input"
                />
              </div>
              <select
                value={field.type}
                onChange={(e) =>
                  updateField(field.id, { type: e.target.value as CustomFieldType })
                }
                className="input w-40 shrink-0"
              >
                {(Object.keys(TYPE_LABELS) as CustomFieldType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {field.type === "select" && (
              <div className="mt-2">
                <input
                  value={(field.options || []).join(", ")}
                  onChange={(e) =>
                    updateField(field.id, {
                      options: e.target.value
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Options, comma separated — e.g. Vegetarian, Vegan, No preference"
                  className="input"
                />
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-ink/60">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                />
                Required
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(field.id, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 py-0.5 text-xs text-ink/40 hover:text-ink disabled:opacity-20"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(field.id, 1)}
                  disabled={i === fields.length - 1}
                  className="rounded px-1.5 py-0.5 text-xs text-ink/40 hover:text-ink disabled:opacity-20"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="ml-1 rounded px-1.5 py-0.5 text-xs font-semibold text-rose/70 hover:text-rose"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        className="mt-3 rounded-full border border-dashed border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink/60 hover:border-stub-400 hover:text-stub-600"
      >
        + Add question
      </button>
    </div>
  );
}
