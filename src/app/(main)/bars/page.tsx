import { BarsView } from "@/components/bars/bars-view";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { TrackView } from "@/components/track-view";
import { getBars } from "@/lib/bars";

export default async function BarsPage() {
  // Server-fetch the default city's bars so the list + map markers are in the
  // initial HTML. The client re-fetches only when the user changes city/type/search.
  const initialBars = await getBars({ city: "Delhi NCR" });
  return (
    <div className="space-y-4">
      <TrackView targetType="BAR" context={{ surface: "bars-list" }} />
      <CatalogTabs active="/bars" />
      <BarsView initialBars={initialBars} />
    </div>
  );
}
