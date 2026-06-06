import { DrinkDetail } from "@/components/drinks/drink-detail";

export default async function DrinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DrinkDetail drinkSlug={id} />;
}
