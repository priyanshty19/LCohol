import { notFound } from "next/navigation";
import { DrinkDetail } from "@/components/drinks/drink-detail";
import { TrackView } from "@/components/track-view";
import { SimilarDrinks } from "@/components/discovery/similar-drinks";
import { getDrinkBySlug } from "@/lib/drinks";
import type { DrinkWithRelations } from "@/types/database";

export default async function DrinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // SSR the drink so the page paints with data — no blank-shell → client-fetch
  // waterfall. DrinkDetail seeds from this and only refetches on slug change.
  const drink = await getDrinkBySlug(id);
  if (!drink) notFound();

  return (
    <>
      <TrackView interactionType="CLICK_DRINK" targetType="DRINK" context={{ slug: id }} />
      {/* abv/communityScores are coerced Decimal→number for the RSC boundary —
          the same shape the client already received via JSON. */}
      <DrinkDetail drinkSlug={id} initialDrink={drink as unknown as DrinkWithRelations} />
      <div className="mt-8">
        <SimilarDrinks slug={id} />
      </div>
    </>
  );
}
