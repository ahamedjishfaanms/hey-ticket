"use client";

import { useId, useRef, useState } from "react";

// Vercel caps request bodies at ~4.5MB, so anything bigger is shrunk in
// the browser before upload. 4MB leaves headroom for multipart overhead.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Re-encodes an image as JPEG, stepping down size/quality until it fits.
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const attempts: [number, number][] = [
    [2400, 0.85],
    [2000, 0.8],
    [1600, 0.75],
    [1200, 0.7],
  ];
  for (const [maxSide, quality] of attempts) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error("too-large");
}

export default function ImageUploader({
  value,
  onChange,
  label = "Cover image (optional)",
  helpText = "PNG, JPG or WebP — large photos are resized automatically",
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
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Use a PNG, JPG, WebP or GIF image");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      let toSend: Blob = file;
      let name = file.name;
      if (file.size > MAX_UPLOAD_BYTES) {
        // GIFs would lose their animation; ask for a smaller one instead.
        if (file.type === "image/gif") throw new Error("too-large");
        toSend = await shrinkImage(file);
        name = name.replace(/\.\w+$/, "") + ".jpg";
      }

      const formData = new FormData();
      formData.append("image", toSend, name);

      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      // Errors from the hosting platform (e.g. 413) are plain text, not JSON.
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error ||
            (res.status === 413 ? "That image is too large — try one under 4MB" : "Upload failed — try again")
        );
      } else if (data?.url) {
        onChange(data.url);
      } else {
        setError("Upload failed — try again");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "too-large"
          ? "That image is too large — try one under 4MB"
          : "Upload failed — check your connection and try again"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
          {label}
        </label>
      )}

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
          aria-label={label ? `Upload ${label.replace(/\s*\(optional\)/i, "").toLowerCase()}` : "Upload image"}
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
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p role="alert" className="mt-1 text-xs text-rose">
          {error}
        </p>
      )}
    </div>
  );
}
