import { VibeView } from "@/components/vibe/vibe-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tonight's Vibe — SIPSTORIES" };

export default function VibePage() {
  return <VibeView />;
}
