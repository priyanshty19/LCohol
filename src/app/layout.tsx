import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  EB_Garamond,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Geist_Mono,
} from "next/font/google";
import { AgeGateOverlay } from "@/components/shared/age-gate-overlay";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getCurrentUser } from "@/lib/auth";
import { THEME_COOKIE, isThemeId, type ThemeId } from "@/lib/theme";
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
  title: {
    default: "SIPSTORIES",
    template: "%s | SIPSTORIES",
  },
  description:
    "Anonymous social platform for drinking culture, cocktail discovery, and nightlife experiences.",
  keywords: [
    "drinking culture",
    "cocktails",
    "nightlife",
    "drink reviews",
    "anonymous community",
  ],
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
        <ThemeProvider />
        <AgeGateOverlay />
        {children}
      </body>
    </html>
  );
}
