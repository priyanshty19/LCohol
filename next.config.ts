import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation=(self): our own origin may use the Geolocation API (the "Near
  // me" bars feature). camera/mic stay fully disabled. Without (self) the browser
  // blocks getCurrentPosition before it can even prompt.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for styles; nonces would be the stricter alternative
      "style-src 'self' 'unsafe-inline'",
      // Next.js hydration + dev HMR need eval/inline. Clerk loads its JS from clerk.accounts.dev
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev",
      // *.basemaps.cartocdn.com serves the Leaflet map tiles on /bars (dark_all on
      // light themes, Voyager on dark themes). Without it the CSP blocks every
      // tile PNG and the map renders as a black/empty box.
      "img-src 'self' blob: data: https://images.unsplash.com https://eihjedfbnlubihyuphlh.supabase.co https://*.clerk.accounts.dev https://*.basemaps.cartocdn.com",
      "connect-src 'self' ws: wss: https://eihjedfbnlubihyuphlh.supabase.co wss://eihjedfbnlubihyuphlh.supabase.co https://clerk.accounts.dev https://*.clerk.accounts.dev",
      "font-src 'self' data:",
      // Clerk renders its CAPTCHA / OAuth UI in iframes from its own domain
      "frame-src 'self' https://*.clerk.accounts.dev",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "eihjedfbnlubihyuphlh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
