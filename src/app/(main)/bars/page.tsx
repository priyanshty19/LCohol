import { BarsView } from "@/components/bars/bars-view";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { TrackView } from "@/components/track-view";

export default function BarsPage() {
  // Google Maps JavaScript keys are delivered to the browser by design. Prefer
  // a dedicated public key, while keeping existing deployments working with the
  // already-configured server key.
  const mapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="space-y-4">
      <TrackView targetType="BAR" context={{ surface: "bars-list" }} />
      <CatalogTabs active="/bars" />
      <BarsView mapsApiKey={mapsApiKey} />
    </div>
  );
}
