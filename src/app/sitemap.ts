import type { MetadataRoute } from "next";
import { isProductionIndexingEnabled, PRODUCTION_SITE_URL } from "@/lib/site";

const PUBLIC_PATHS: { path: string; priority: number; changeFrequency?: "monthly" | "weekly" }[] = [
  { path: "/", priority: 1.0 },
  { path: "/Terms-and-Condition", priority: 0.4, changeFrequency: "monthly" },
  { path: "/Privacy-Policy", priority: 0.4, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProductionIndexingEnabled()) return [];

  return PUBLIC_PATHS.map(({ path, priority, changeFrequency = "weekly" }) => ({
    url: `${PRODUCTION_SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
