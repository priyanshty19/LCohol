import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CocktailDetail } from "@/components/cocktails/cocktail-detail";
import { getCocktailBySlug } from "@/lib/cocktails";
import { toCatalogCocktail } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cocktail = await getCocktailBySlug(slug);
  if (!cocktail) return { title: "Cocktail not found" };
  // Don't leak a private mix's name in metadata to non-owners (mirrors the page gate).
  if (!cocktail.isPublic) {
    const me = await getCurrentUser();
    if (cocktail.authorId !== me?.id) return { title: "Cocktail not found" };
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

  // Private mixes are visible only to their author.
  if (!cocktail.isPublic) {
    const me = await getCurrentUser();
    if (cocktail.authorId !== me?.id) notFound();
  }

  return <CocktailDetail entry={toCatalogCocktail(cocktail)} />;
}
