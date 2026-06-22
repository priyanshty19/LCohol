import type { Metadata } from "next";
import { CocktailsView } from "@/components/cocktails/cocktails-view";

export const metadata: Metadata = {
  title: "Cocktails",
  description: "Editorial picks from India's best bars.",
};

export default function CocktailsPage() {
  return <CocktailsView />;
}
