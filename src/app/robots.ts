import type { MetadataRoute } from "next";
import { isProductionIndexingEnabled, PRODUCTION_SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionIndexingEnabled()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/moderation",
        "/settings",
        "/profile",
        "/onboarding",
        "/party/",
        "/parties",
        "/post/",
        "/create",
        "/search",
        "/circle",
        "/login",
        "/signup",
        "/verify-age",
        "/denied",
      ],
    },
    sitemap: `${PRODUCTION_SITE_URL}/sitemap.xml`,
    host: PRODUCTION_SITE_URL,
  };
}
