import { DrinksView } from "@/components/drinks/drinks-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drinks",
};

export default function DrinksPage() {
  return <DrinksView />;
}
