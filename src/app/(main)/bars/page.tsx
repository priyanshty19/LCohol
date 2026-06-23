import { BarsView } from "@/components/bars/bars-view";
import { getBars } from "@/lib/bars";

export default async function BarsPage() {
  // Server-fetch the default city's bars so the list + map markers are in the
  // initial HTML. The client re-fetches only when the user changes city/type/search.
  const initialBars = await getBars({ city: "Delhi NCR" });
  return <BarsView initialBars={initialBars} />;
}
