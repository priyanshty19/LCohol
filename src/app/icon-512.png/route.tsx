import { appIcon } from "@/lib/app-icon";

// Served at /icon-512.png (referenced by the web manifest).
export const runtime = "edge";
export function GET() {
  return appIcon(512);
}
