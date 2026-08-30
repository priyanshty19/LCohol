"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  normalizeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";
import { ANALYTICS_CONSENT_COOKIE } from "@/lib/analytics";
import { getCookie, setCookie } from "@/lib/client-cookies";
import { toast } from "@/lib/toast";

export function AnalyticsPrivacySetting() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/privacy/analytics", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        const accountConsent = normalizeAnalyticsConsent(payload.data?.consent);
        setAuthenticated(payload.authenticated === true);
        setConsent(
          accountConsent ?? normalizeAnalyticsConsent(getCookie(ANALYTICS_CONSENT_COOKIE)),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(next: AnalyticsConsent) {
    if (saving || next === consent) return;
    setSaving(true);
    try {
      if (authenticated) {
        const response = await fetch("/api/privacy/analytics", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent: next }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Couldn't save your privacy choice.");
      }

      setCookie(ANALYTICS_CONSENT_COOKIE, next);
      setConsent(next);
      window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: next }));
      toast.success("Privacy choice saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your privacy choice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Usage analytics</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Choose whether Sip Stories may use privacy-safe Google Analytics. Advertising tracking
          remains off. Signed-in choices follow you across devices; otherwise the choice is saved
          on this device.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Usage analytics preference">
        <button
          type="button"
          disabled={loading || saving}
          aria-pressed={consent === "denied"}
          onClick={() => void save("denied")}
          className="rounded-xl border border-border/70 px-4 py-3 text-left transition disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary/10"
        >
          <span className="block text-sm font-medium">Essential only</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">No optional analytics.</span>
        </button>
        <button
          type="button"
          disabled={loading || saving}
          aria-pressed={consent === "granted"}
          onClick={() => void save("granted")}
          className="rounded-xl border border-border/70 px-4 py-3 text-left transition disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary/10"
        >
          <span className="block text-sm font-medium">Allow analytics</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Help improve screens and flows.</span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {loading
          ? "Loading your saved choice…"
          : saving
            ? "Saving…"
            : consent
              ? authenticated
                ? "Saved to your account."
                : "Saved on this device."
              : "No choice saved yet."}
      </p>
    </div>
  );
}
