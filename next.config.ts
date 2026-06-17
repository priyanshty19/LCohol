import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for styles; nonces would be the stricter alternative
      "style-src 'self' 'unsafe-inline'",
      // Next.js hydration bundles + Supabase realtime WS
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "img-src 'self' blob: data: https://images.unsplash.com https://eihjedfbnlubihyuphlh.supabase.co",
      "connect-src 'self' https://eihjedfbnlubihyuphlh.supabase.co wss://eihjedfbnlubihyuphlh.supabase.co https://clerk.accounts.dev https://*.clerk.accounts.dev",
      "font-src 'self'",
      "frame-src 'none'",
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
