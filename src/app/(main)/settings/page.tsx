import { SettingsView } from "@/components/shared/settings-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return <SettingsView />;
}
