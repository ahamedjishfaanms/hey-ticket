import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Proxies image uploads to ImgBB so the API key never reaches the
// browser. Accepts a multipart form with a single "image" field and
// returns the hosted URL to store as an event's cover_image_url.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Image uploads aren't configured (missing IMGBB_API_KEY)" },
      { status: 500 }
    );
  }

  const incoming = await request.formData().catch(() => null);
  if (!incoming) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  const file = incoming.get("image");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Vercel rejects request bodies over ~4.5MB before this code even runs,
  // so the real ceiling is 4MB. The browser uploader shrinks bigger photos
  // before sending; this is the backstop.
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 4MB" }, { status: 400 });
  }

  // Check the type ourselves rather than relying on ImgBB's error (which
  // came back as a confusing 502). SVG is excluded on purpose: it can
  // carry script.
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a PNG, JPG, WebP or GIF image" },
      { status: 400 }
    );
  }

  const outgoing = new FormData();
  outgoing.append("image", file, (file as File).name || "cover.jpg");

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: outgoing,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.data?.url) {
    // A rejection of the file itself is the user's problem (400); anything
    // else is the image host being down (502).
    const isClientError = res.status >= 400 && res.status < 500;
    return NextResponse.json(
      {
        error: isClientError
          ? data?.error?.message || "That file couldn't be used as an image"
          : "The image host is having trouble — try again in a minute",
      },
      { status: isClientError ? 400 : 502 }
    );
  }

  return NextResponse.json({ url: data.data.url as string });
}
