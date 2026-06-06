import { SearchView } from "@/components/shared/search-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchPage() {
  return <SearchView />;
}
