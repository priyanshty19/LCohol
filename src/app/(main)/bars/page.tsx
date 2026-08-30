import { BarsView } from "@/components/bars/bars-view";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { TrackView } from "@/components/track-view";

export default function BarsPage() {
  return (
    <div className="space-y-4">
      <TrackView targetType="BAR" context={{ surface: "bars-list" }} />
      <CatalogTabs active="/bars" />
      <BarsView />
    </div>
  );
}
