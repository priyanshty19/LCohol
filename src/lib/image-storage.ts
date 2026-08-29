import "server-only";
import { createClient } from "@supabase/supabase-js";

export const POST_IMAGE_BUCKET = "post-images";

export function imageStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !url.startsWith("http")) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function ownedMixImagePath(value: string | null, ownerId: string): string | null {
  if (!value) return null;
  try {
    const storageOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
    const image = new URL(value);
    const publicPrefix = `/storage/v1/object/public/${POST_IMAGE_BUCKET}/`;
    const ownedPrefix = `${ownerId}/mixes/`;
    if (image.protocol !== "https:" || image.origin !== storageOrigin || !image.pathname.startsWith(publicPrefix)) {
      return null;
    }
    const path = decodeURIComponent(image.pathname.slice(publicPrefix.length));
    return path.startsWith(ownedPrefix) ? path : null;
  } catch {
    return null;
  }
}
