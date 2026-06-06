import type { Metadata } from "next";
import { EB_Garamond, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { AgeGateOverlay } from "@/components/shared/age-gate-overlay";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${ebGaramond.variable} ${plusJakartaSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AgeGateOverlay />
        {children}
      </body>
    </html>
  );
}
