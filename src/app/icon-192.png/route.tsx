import { appIcon } from "@/lib/app-icon";

// Served at /icon-192.png (referenced by the web manifest). The .png suffix means
// the auth proxy matcher skips it, so it's publicly reachable pre-login.
export const runtime = "edge";
export function GET() {
  return appIcon(192);
}
