import { LoginExperience } from "@/components/landing/login-experience";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { isProductionIndexingEnabled, PRODUCTION_SITE_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const isPublicHome = requestHeaders.get("x-sipstories-public-home") === "1";

  if (!isPublicHome) {
    return {
      title: "Welcome",
      alternates: { canonical: "/" },
      robots: { index: false, follow: true },
    };
  }

  return {
    title: { absolute: "Sip Stories — India’s Anonymous Tasting Room" },
    description:
      "Pull up a stool for anonymous sip stories, cocktail discovery, Indian bar finds, nightlife, and James, your AI bartender.",
    alternates: { canonical: "/" },
    robots: isProductionIndexingEnabled()
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      url: "/",
      title: "Sip Stories — India’s Anonymous Tasting Room",
      description:
        "Anonymous sip stories, cocktails, bar finds, nightlife, and James, your AI bartender.",
    },
  };
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${PRODUCTION_SITE_URL}/#website`,
      url: `${PRODUCTION_SITE_URL}/`,
      name: "Sip Stories",
      description: "India’s anonymous tasting room.",
      inLanguage: "en-IN",
      publisher: { "@id": `${PRODUCTION_SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${PRODUCTION_SITE_URL}/#organization`,
      name: "Sip Stories",
      url: `${PRODUCTION_SITE_URL}/`,
      logo: `${PRODUCTION_SITE_URL}/icon-512.png`,
    },
  ],
};

export default function LoginPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LoginExperience />
    </>
  );
}
