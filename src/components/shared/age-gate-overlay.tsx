"use client";

import { useState, useEffect } from "react";
import { getCookie, setCookie } from "@/lib/client-cookies";

export const AGE_COOKIE = "sip_age_ok";
export const GEO_COOKIE = "sip_geo_ok";

export function AgeGateOverlay() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Persistent cookie (1yr) — survives tab close, unlike the old sessionStorage.
    const verified = getCookie(AGE_COOKIE);
    if (!verified) {
      setVisible(true);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleAccept() {
    setExiting(true);
    setTimeout(() => {
      // Only record age verification. The geo/prohibition-states disclaimer is a
      // SEPARATE legal acknowledgement — it must still appear as its own banner
      // and be dismissed on its own, so we do NOT touch GEO_COOKIE here.
      setCookie(AGE_COOKIE, "1");
      document.body.style.overflow = "";
      setVisible(false);
    }, 400);
  }

  function handleDecline() {
    window.location.href = "https://www.google.com";
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-400 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop — matches the landing's ivory base + wine aurora */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-20" />

      {/* Content */}
      <div
        className={`relative z-10 mx-6 w-full max-w-md transition-all duration-400 ${
          exiting ? "translate-y-4 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        {/* Logo area */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-wide">
            <span className="italic text-primary">Sip</span>{" "}
            <span className="text-foreground">Stories</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stories worth sipping on
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel-elevated rounded-2xl border border-border/60 p-8">
          {/* 21+ badge */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/35 bg-primary/10">
            <span className="font-display text-3xl font-bold text-primary">
              21+
            </span>
          </div>

          <h2 className="text-center font-display text-xl font-medium text-foreground">
            Age Verification
          </h2>

          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            You must be 21 years or older to access SipStories. This platform
            contains alcohol-related content intended for adults of legal
            drinking age in India.
          </p>

          {/* Buttons */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleAccept}
              className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
            >
              I am 21+ — Enter
            </button>
            <button
              onClick={handleDecline}
              className="w-full rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              I am under 21
            </button>
          </div>
        </div>

        {/* Prohibition states disclaimer */}
        <div className="mt-6 rounded-xl border border-border/60 bg-muted/40 px-5 py-4">
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              Alcohol is prohibited
            </span>{" "}
            in Gujarat, Bihar, Mizoram, Nagaland & Lakshadweep. This platform
            is for informational and community purposes only — it does not
            promote, sell, or deliver alcohol.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground/70">
          Drink Responsibly
        </p>
      </div>
    </div>
  );
}
