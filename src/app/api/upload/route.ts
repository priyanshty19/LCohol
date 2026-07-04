import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BUCKET = "post-images";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — images arrive already compressed
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Sniff the real image type from magic bytes — never trust the client-declared
 *  Content-Type. Returns the canonical MIME or null if it isn't an allowed raster. */
function sniffImageType(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  )
    return "image/png";
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

/** Service-role Supabase client. Server-only — the key is NEVER exposed to the
 *  browser. Returns null if uploads aren't configured. */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !url.startsWith("http")) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  // Auth-gated: only signed-in, non-banned users can upload, rate-limited.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  if (!(await rateLimit(`upload:${user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: "Too many uploads — slow down a touch." }, { status: 429 });
  }

  const supabase = adminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Image uploads aren't configured yet." },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large." }, { status: 400 });
  }

  // Verify by content, not the client's Content-Type. The sniffed type drives
  // both the stored extension and the served contentType, so a renamed/polyglot
  // file can't be stored as an image it isn't.
  const buffer = Buffer.from(await file.arrayBuffer());
  const realType = sniffImageType(buffer);
  if (!realType || !ALLOWED.has(realType)) {
    return NextResponse.json(
      { error: "File is not a valid JPEG, PNG or WebP image." },
      { status: 400 }
    );
  }

  const ext = realType === "image/png" ? "png" : realType === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const upload = () =>
    supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: realType,
      upsert: false,
    });

  let { error } = await upload();
  // First run: create the public bucket on demand, then retry once.
  if (error && /bucket not found/i.test(error.message)) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: [...ALLOWED],
    });
    ({ error } = await upload());
  }
  if (error) {
    console.error("[upload]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
