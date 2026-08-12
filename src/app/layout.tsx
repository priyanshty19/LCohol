import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  EB_Garamond,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Geist_Mono,
} from "next/font/google";
import { AgeGateOverlay } from "@/components/shared/age-gate-overlay";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { getCurrentUser } from "@/lib/auth";
import { THEME_COOKIE, isThemeId, type ThemeId } from "@/lib/theme";
import { isProductionIndexingEnabled, PRODUCTION_SITE_URL } from "@/lib/site";
import "./globals.css";

// Resolve the theme on the SERVER so the SSR HTML already carries the right
// palette — no flash/flip after hydration. Priority: the signed-in user's saved
// theme (DB) > the cookie (logged-out / fast path) > light default.
async function resolveTheme(): Promise<ThemeId> {
  try {
    const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
    const dbTheme = user?.profile?.theme;
    if (isThemeId(dbTheme)) return dbTheme;
    const cookieTheme = cookieStore.get(THEME_COOKIE)?.value;
    if (isThemeId(cookieTheme)) return cookieTheme;
  } catch {
    /* fall through to default */
  }
  return "light";
}

const ebGaramond = EB_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Display / wordmark / James's voice — heritage wine-label serif, italic for his lines.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_URL),
  manifest: "/manifest.json",
  applicationName: "Sip Stories",
  title: {
    default: "Sip Stories — India’s Anonymous Tasting Room",
    template: "%s | Sip Stories",
  },
  description:
    "India’s anonymous community for sip stories, cocktail discovery, bar finds, nightlife, and James, your AI bartender.",
  authors: [{ name: "Sip Stories", url: PRODUCTION_SITE_URL }],
  creator: "Sip Stories",
  publisher: "Sip Stories",
  category: "Lifestyle",
  keywords: [
    "drinking culture",
    "cocktails",
    "nightlife",
    "drink reviews",
    "anonymous community",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: PRODUCTION_SITE_URL,
    siteName: "Sip Stories",
    title: "Sip Stories — India’s Anonymous Tasting Room",
    description:
      "Anonymous sip stories, cocktail discovery, bar finds, nightlife, and James, your AI bartender.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sip Stories — India’s Anonymous Tasting Room",
    description:
      "Anonymous sip stories, cocktail discovery, bar finds, nightlife, and James, your AI bartender.",
  },
  robots: isProductionIndexingEnabled()
    ? undefined
    : {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await resolveTheme();
  const isLight = theme === "light";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme}
      className={`${ebGaramond.variable} ${playfair.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased ${isLight ? "light" : "dark"}`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics
          measurementId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}
        />
        <ThemeProvider />
        <AgeGateOverlay />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
