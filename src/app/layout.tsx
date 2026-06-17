import type { Metadata } from "next";
import {
  EB_Garamond,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Geist_Mono,
} from "next/font/google";
import Script from "next/script";
import { AgeGateOverlay } from "@/components/shared/age-gate-overlay";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

// Runs before first paint: set data-theme AND the dark/light class from the
// cookie so there's no flash of the wrong palette, and so dark: variants only
// fire on dark-family themes (light gets the .light class, never .dark).
const THEME_BOOTSTRAP = `(function(){try{var m=document.cookie.match(/(?:^|; )sip_theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):'light';var ok=['dark','light','party','chill','date-night','celebrate','solo','budget'];var theme=ok.indexOf(t)>-1?t:'light';var el=document.documentElement;el.dataset.theme=theme;el.classList.toggle('dark',theme!=='light');el.classList.toggle('light',theme==='light');}catch(e){}})();`;

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ebGaramond.variable} ${playfair.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
        <ThemeProvider />
        <AgeGateOverlay />
        {children}
      </body>
    </html>
  );
}
