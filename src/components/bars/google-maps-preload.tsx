"use client";

import { useEffect } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export function GoogleMapsPreload({ apiKey }: { apiKey: string }) {
  useEffect(() => {
    if (!apiKey) return;
    const timer = window.setTimeout(() => {
      void loadGoogleMaps(apiKey).catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [apiKey]);

  return null;
}
