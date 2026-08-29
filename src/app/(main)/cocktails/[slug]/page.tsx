import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CocktailDetail } from "@/components/cocktails/cocktail-detail";
import { TrackView } from "@/components/track-view";
import { getCocktailBySlug } from "@/lib/cocktails";
import { toCatalogCocktail } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { areConnected } from "@/lib/connections";

type CocktailForGate = NonNullable<Awaited<ReturnType<typeof getCocktailBySlug>>>;
type Viewer = Awaited<ReturnType<typeof getCurrentUser>>;

async function canViewCocktail(cocktail: CocktailForGate, me: Viewer) {
  if (cocktail.isPublic) return true;
  if (!me) return false;
  return cocktail.authorId === me.id || areConnected(cocktail.authorId, me.id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cocktail = await getCocktailBySlug(slug);
  if (!cocktail) return { title: "Cocktail not found" };
  // Don't leak a private mix's name in metadata to non-viewers (mirrors the page gate).
  if (!cocktail.isPublic && !(await canViewCocktail(cocktail, await getCurrentUser()))) {
    return { title: "Cocktail not found" };
  }
  return {
    title: cocktail.name,
    description: cocktail.instructions?.slice(0, 150) ?? `How to make a ${cocktail.name}.`,
  };
}

export default async function CocktailDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cocktail = await getCocktailBySlug(slug);
  if (!cocktail) notFound();

  // Private mixes are visible to the author and their circle.
  const me = await getCurrentUser();
  if (!(await canViewCocktail(cocktail, me))) notFound();

  return (
    <>
      <TrackView targetType="COCKTAIL" targetId={cocktail.id} context={{ slug }} />
      <CocktailDetail
        entry={toCatalogCocktail(cocktail)}
        canEditImage={Boolean(me && cocktail.authorId === me.id && !cocktail.isCurated)}
      />
    </>
  );
}
