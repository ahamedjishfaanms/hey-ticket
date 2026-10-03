"use client";

import { useRef, useState } from "react";

export default function ImageUploader({
  value,
  onChange,
  label = "Cover image (optional)",
  helpText = "PNG or JPG, up to 10MB",
  previewClassName = "h-40 w-full rounded-lg object-cover",
  boxClassName = "h-32 w-full",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helpText?: string;
  previewClassName?: string;
  boxClassName?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        onChange(data.url);
      }
    } catch {
      setError("Upload failed — check your connection and try again");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}

      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className={previewClassName} />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-paper hover:bg-ink"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/15 text-sm text-ink/50 hover:border-stub-400 hover:text-stub-600 disabled:opacity-50 ${boxClassName}`}
        >
          {uploading ? (
            <span>Uploading…</span>
          ) : (
            <>
              <span className="font-semibold">Click to upload an image</span>
              <span className="text-xs text-ink/40">{helpText}</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-rose">{error}</p>}
    </div>
  );
}
