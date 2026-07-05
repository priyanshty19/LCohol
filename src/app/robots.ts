import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://sipstories-phi.vercel.app";

// Most of the app is auth-gated (crawlers just get redirected to /login), so we
// only invite indexing of the public marketing/legal surface and explicitly keep
// bots out of the API and private/admin areas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/moderation", "/settings", "/profile"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
