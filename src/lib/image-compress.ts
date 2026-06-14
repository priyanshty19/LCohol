// Client-side image compression, WhatsApp-style: downscale to a max long edge
// and re-encode as JPEG. The canvas re-encode also strips EXIF/metadata (incl.
// GPS), which is a privacy win. Keeps uploads small to save storage + bandwidth.

export type CompressOptions = {
  maxEdge?: number; // longest side in px
  quality?: number; // 0..1 JPEG quality
};

export async function compressImage(
  file: File,
  { maxEdge = 1600, quality = 0.8 }: CompressOptions = {}
): Promise<Blob> {
  // Non-raster types (e.g. GIF animations) — leave untouched.
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  const longest = Math.max(width, height);
  if (longest > maxEdge) {
    const scale = maxEdge / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file; // canvas unsupported — fall back to the original
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  return blob ?? file;
}
