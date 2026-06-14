import { HangoverView } from "@/components/hangover/hangover-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hangover SOS — SIPSTORIES" };

export default function HangoverPage() {
  return <HangoverView />;
}
