import { MixLabView } from "@/components/mix/mix-lab-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mix Lab — SIPSTORIES" };

export default function MixPage() {
  return <MixLabView />;
}
