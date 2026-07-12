import { DrinkDetail } from "@/components/drinks/drink-detail";
import { TrackView } from "@/components/track-view";
import { DrinkRail } from "@/components/discovery/drink-rail";

export default async function DrinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <TrackView interactionType="CLICK_DRINK" targetType="DRINK" context={{ slug: id }} />
      <DrinkDetail drinkSlug={id} />
      <div className="mt-8">
        <DrinkRail
          title="More like this"
          endpoint={`/api/recommendations/similar?slug=${encodeURIComponent(id)}`}
        />
      </div>
    </>
  );
}
