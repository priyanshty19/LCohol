import { DrinkDetail } from "@/components/drinks/drink-detail";
import { TrackView } from "@/components/track-view";

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
    </>
  );
}
