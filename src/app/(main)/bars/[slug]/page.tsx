import { notFound } from "next/navigation";
import { BarDetail } from "@/components/bars/bar-detail";
import { TrackView } from "@/components/track-view";
import { toCatalogCocktails } from "@/lib/catalog";
import { getBarBySlug } from "@/lib/bars";
import { getCocktailsCached } from "@/lib/cocktails";

export default async function BarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bar = await getBarBySlug(slug);
  if (!bar) notFound();

  const { cocktails } = await getCocktailsCached({ barId: bar.id, take: 6 });

  return (
    <>
      <TrackView targetType="BAR" targetId={bar.id} context={{ slug }} />
      <BarDetail bar={bar} cocktails={toCatalogCocktails(cocktails)} />
    </>
  );
}
