import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeCocktailImageUrl } from "@/lib/cocktail-image";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { imageStorageAdminClient, ownedMixImagePath, POST_IMAGE_BUCKET } from "@/lib/image-storage";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!(await rateLimit(`cocktail-image:${me.id}`, 12, 60_000))) {
    return NextResponse.json(
      { error: "Too many image changes. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const imageUrl = sanitizeCocktailImageUrl(body.imageUrl, me.id);
  if (!imageUrl) {
    return NextResponse.json({ error: "Upload a valid drink image first." }, { status: 400 });
  }

  try {
    const cocktail = await prisma.cocktailCreation.findFirst({
      where: { id, authorId: me.id, isCurated: false },
      select: { id: true, slug: true, imageUrl: true },
    });
    if (!cocktail) {
      return NextResponse.json({ error: "Cocktail not found" }, { status: 404 });
    }

    const updated = await prisma.cocktailCreation.update({
      where: { id: cocktail.id },
      data: { imageUrl },
      select: { id: true, slug: true, imageUrl: true },
    });
    revalidatePath(`/cocktails/${updated.slug}`);
    revalidatePath("/cocktails/mine");

    // A replacement should not keep consuming storage. Remove the previous
    // owned Mix Lab image only when no other cocktail still references it.
    if (cocktail.imageUrl && cocktail.imageUrl !== imageUrl) {
      try {
        const sharedReferences = await prisma.cocktailCreation.count({
          where: { imageUrl: cocktail.imageUrl, id: { not: cocktail.id } },
        });
        const oldPath = sharedReferences === 0 ? ownedMixImagePath(cocktail.imageUrl, me.id) : null;
        const storage = oldPath ? imageStorageAdminClient() : null;
        if (storage && oldPath) {
          const { error: storageError } = await storage.storage.from(POST_IMAGE_BUCKET).remove([oldPath]);
          if (storageError) console.warn("[api/cocktails/[id]/image] old image cleanup", storageError);
        }
      } catch (cleanupError) {
        console.warn("[api/cocktails/[id]/image] old image cleanup", cleanupError);
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/cocktails/[id]/image]", error);
    return NextResponse.json({ error: "Couldn't update the drink image." }, { status: 500 });
  }
}
