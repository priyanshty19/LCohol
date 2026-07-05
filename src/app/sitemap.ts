import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://sipstories-phi.vercel.app";

// Only the genuinely public, indexable pages. The rest of the app requires auth
// and redirects to /login, so listing it would just point crawlers at redirects.
const PUBLIC_PATHS: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/login", priority: 0.8 },
  { path: "/signup", priority: 0.8 },
  { path: "/help", priority: 0.5 },
  { path: "/compliance/terms", priority: 0.4 },
  { path: "/compliance/privacy", priority: 0.4 },
  { path: "/compliance/grievance", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority,
  }));
}
