"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_COOKIE,
  configureGoogleAnalytics,
  ensureGoogleTagQueue,
  trackAnalyticsEvent,
  trackPageView,
} from "@/lib/analytics";
import {
  ANALYTICS_CONSENT_EVENT,
  normalizeAnalyticsConsent,
  resolveInitialAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";
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
  const [accountBacked, setAccountBacked] = useState(false);
  const [savingChoice, setSavingChoice] = useState(false);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const checkedAccount = useRef(false);

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

  }, [validMeasurementId]);

  // The account is the source of truth once signed in. Until a session exists,
  // retain the cookie-only fallback; after login, migrate that existing choice
  // into the account so established users are not asked again.
  useEffect(() => {
    if (!validMeasurementId || checkedAccount.current) return;
    let active = true;

    async function loadPreference() {
      const cookieConsent = normalizeAnalyticsConsent(getCookie(ANALYTICS_CONSENT_COOKIE));
      let accountConsent: AnalyticsConsent | null = null;
      let authenticated = false;

      try {
        const response = await fetch("/api/privacy/analytics", { cache: "no-store" });
        const payload = await response.json();
        authenticated = payload.authenticated === true;
        accountConsent = normalizeAnalyticsConsent(payload.data?.consent);
      } catch {
        // A temporary API failure must never opt the visitor into analytics.
      }

      const initial = resolveInitialAnalyticsConsent(accountConsent, cookieConsent, authenticated);
      if (initial.shouldPersistCookieToAccount && initial.consent) {
        try {
          const migrated = await fetch("/api/privacy/analytics", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consent: initial.consent }),
          });
          if (migrated.ok) checkedAccount.current = true;
        } catch {
          // Retry the one-time migration on the next navigation.
        }
      } else if (authenticated) {
        checkedAccount.current = true;
      }

      if (!active) return;
      setAccountBacked(authenticated);
      setConsent(initial.consent);
      setShowChoices(initial.shouldPrompt);
      if (initial.consent) {
        setCookie(ANALYTICS_CONSENT_COOKIE, initial.consent);
        updateGoogleConsent(initial.consent);
        if (initial.consent === "denied") clearGoogleAnalyticsCookies();
      }
    }

    void loadPreference();
    return () => {
      active = false;
    };
  }, [pathname, validMeasurementId]);

  useEffect(() => {
    function receiveSettingsChoice(event: Event) {
      const next = normalizeAnalyticsConsent((event as CustomEvent).detail);
      if (!next) return;
      setConsent(next);
      setShowChoices(false);
      setChoiceError(null);
      updateGoogleConsent(next);
      if (next === "denied") {
        setReady(false);
        window.__sipAnalyticsPending = [];
        clearGoogleAnalyticsCookies();
      }
    }

    window.addEventListener(ANALYTICS_CONSENT_EVENT, receiveSettingsChoice);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, receiveSettingsChoice);
  }, []);

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

  async function choose(next: AnalyticsConsent) {
    if (savingChoice) return;
    setSavingChoice(true);
    setChoiceError(null);

    if (accountBacked) {
      try {
        const response = await fetch("/api/privacy/analytics", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent: next }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Couldn't save your privacy choice.");
      } catch (error) {
        setChoiceError(error instanceof Error ? error.message : "Couldn't save your privacy choice.");
        setSavingChoice(false);
        return;
      }
    }

    setCookie(ANALYTICS_CONSENT_COOKIE, next);
    setConsent(next);
    setShowChoices(false);
    updateGoogleConsent(next);

    if (next === "denied") {
      window.__sipAnalyticsPending = [];
      clearGoogleAnalyticsCookies();
    }
    setSavingChoice(false);
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
              disabled={savingChoice}
              onClick={() => void choose("denied")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
            >
              Essential only
            </button>
            <button
              type="button"
              disabled={savingChoice}
              onClick={() => void choose("granted")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Allow analytics
            </button>
          </div>
          {choiceError && <p className="mt-2 text-xs text-destructive">{choiceError}</p>}
        </div>
      ) : null}
    </>
  );
}
