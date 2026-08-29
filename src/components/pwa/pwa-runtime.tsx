"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

/** Register the worker on every visit so launch/offline behavior is reliable. */
export function PwaRuntime() {
  useEffect(() => {
    const onInstallAvailable = () => trackAnalyticsEvent("pwa_install_available");
    const onInstalled = () => trackAnalyticsEvent("pwa_installed");

    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
