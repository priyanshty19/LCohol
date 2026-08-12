"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_COOKIE,
  configureGoogleAnalytics,
  ensureGoogleTagQueue,
  trackAnalyticsEvent,
  trackPageView,
  type AnalyticsConsent,
} from "@/lib/analytics";
import { getCookie, setCookie } from "@/lib/client-cookies";

function updateGoogleConsent(consent: AnalyticsConsent) {
  ensureGoogleTagQueue();
  window.gtag?.("consent", "update", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function clearGoogleAnalyticsCookies() {
  const domainParts = window.location.hostname.split(".");
  const domains = ["", window.location.hostname];
  if (domainParts.length > 1) domains.push(`.${domainParts.slice(-2).join(".")}`);

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=", 1)[0]?.trim();
    if (!name || (name !== "_ga" && !name.startsWith("_ga_"))) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const validMeasurementId = /^G-[A-Z0-9]+$/i.test(measurementId ?? "")
    ? measurementId
    : undefined;
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [showChoices, setShowChoices] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!validMeasurementId) return;

    ensureGoogleTagQueue();
    window.gtag?.("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
    window.gtag?.("set", "ads_data_redaction", true);

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = getCookie(ANALYTICS_CONSENT_COOKIE);
      if (saved === "granted" || saved === "denied") {
        setConsent(saved);
        updateGoogleConsent(saved);
      } else {
        setShowChoices(true);
      }
    });

    return () => {
      active = false;
    };
  }, [validMeasurementId]);

  useEffect(() => {
    if (!ready || consent !== "granted") return;
    trackPageView(pathname);
  }, [consent, pathname, ready]);

  useEffect(() => {
    if (!ready || consent !== "granted") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) trackAnalyticsEvent("pwa_standalone_launch");
  }, [consent, ready]);

  function choose(next: AnalyticsConsent) {
    setCookie(ANALYTICS_CONSENT_COOKIE, next);
    setConsent(next);
    setShowChoices(false);
    updateGoogleConsent(next);

    if (next === "denied") {
      window.__sipAnalyticsPending = [];
      clearGoogleAnalyticsCookies();
    }
  }

  function onTagReady() {
    if (!validMeasurementId || consent !== "granted") return;
    configureGoogleAnalytics(validMeasurementId);
    setReady(true);
  }

  if (!validMeasurementId) return null;

  return (
    <>
      {consent === "granted" && (
        <Script
          id="sipstories-google-analytics"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validMeasurementId)}`}
          strategy="afterInteractive"
          onLoad={onTagReady}
          onReady={onTagReady}
        />
      )}

      {showChoices ? (
        <div
          role="dialog"
          aria-label="Analytics privacy choices"
          className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-2xl rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5"
        >
          <p className="font-display text-base font-semibold text-foreground">Your privacy, your call</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            We use optional Google Analytics to understand which screens help people join and use Sip Stories. We never send emails, OTPs, usernames, invite codes, search text, or messages. Advertising tracking stays off.
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Allow analytics
            </button>
          </div>
        </div>
      ) : consent !== null ? (
        <button
          type="button"
          onClick={() => setShowChoices(true)}
          className="fixed bottom-2 left-2 z-[45] rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
        >
          Privacy choices
        </button>
      ) : null}
    </>
  );
}
