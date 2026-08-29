const PUBLIC_IMAGE_PREFIX = "/storage/v1/object/public/post-images/";

/** Only accept photos uploaded into this user's Mix Lab storage folder. */
export function sanitizeCocktailImageUrl(
  value: unknown,
  ownerId: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (typeof value !== "string" || !value || !supabaseUrl) return null;

  try {
    const storageOrigin = new URL(supabaseUrl).origin;
    const image = new URL(value);
    const ownerPrefix = `${PUBLIC_IMAGE_PREFIX}${ownerId}/mixes/`;

    return image.protocol === "https:" && image.origin === storageOrigin &&
      image.pathname.startsWith(ownerPrefix)
      ? image.toString()
      : null;
  } catch {
    return null;
  }
}
