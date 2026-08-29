export const PRODUCTION_SITE_URL = "https://mysipstories.com";

export function configuredSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  try {
    return new URL(configured || "https://staging.mysipstories.com");
  } catch {
    return new URL("https://staging.mysipstories.com");
  }
}

/** Staging and preview hosts must never compete with the production domain. */
export function isProductionIndexingEnabled(): boolean {
  const host = configuredSiteUrl().hostname.toLowerCase();
  const isProductionHost = host === "mysipstories.com" || host === "www.mysipstories.com";
  return isProductionHost && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";
}
