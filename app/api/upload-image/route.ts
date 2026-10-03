import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

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

  const incoming = await request.formData();
  const file = incoming.get("image");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  const outgoing = new FormData();
  outgoing.append("image", file, (file as File).name || "cover.jpg");

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: outgoing,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.data?.url) {
    return NextResponse.json(
      { error: data?.error?.message || "Upload failed, try again" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: data.data.url as string });
}
