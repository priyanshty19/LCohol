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
      // Prevent body scroll while overlay is visible
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0c0d19]/95 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-ambient opacity-80" />
      <div className="absolute inset-0 bg-grain opacity-70" />

      {/* Content */}
      <div
        className={`relative z-10 mx-6 w-full max-w-md transition-all duration-400 ${
          exiting ? "translate-y-4 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        {/* Logo area */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-glow text-4xl font-semibold tracking-wide text-[#f2bf64]">
            SIPSTORIES
          </h1>
          <p className="mt-1 text-sm text-[#d3c4b2]/70">
            Stories worth sipping on
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-panel-elevated rounded-2xl p-8">
          {/* 21+ badge */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#f2bf64]/40 bg-[#f2bf64]/10">
            <span className="font-display text-3xl font-bold text-[#f2bf64]">
              21+
            </span>
          </div>

          <h2 className="font-display text-center text-2xl font-medium text-[#e2e1f3]">
            Age Verification
          </h2>

          <p className="mt-3 text-center text-sm leading-relaxed text-[#d3c4b2]/80">
            You must be 21 years or older to access SIPSTORIES. This platform
            contains alcohol-related content intended for adults of legal
            drinking age in India.
          </p>

          {/* Buttons */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleAccept}
              className="w-full rounded-full bg-[#f2bf64] px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#11121f] transition-all duration-200 hover:bg-[#d4a44c] hover:shadow-[0_0_20px_rgba(242,191,100,0.3)] active:scale-[0.98]"
            >
              I am 21+ — Enter
            </button>
            <button
              onClick={handleDecline}
              className="w-full rounded-full border border-[#9b8f7e]/30 px-6 py-3 text-sm font-medium text-[#d3c4b2]/70 transition-colors hover:border-[#9b8f7e]/50 hover:text-[#d3c4b2]"
            >
              I am under 21
            </button>
          </div>
        </div>

        {/* Prohibition states disclaimer */}
        <div className="mt-6 rounded-xl border border-[#4f4537]/40 bg-[#1a1b27]/60 px-5 py-4 backdrop-blur-sm">
          <p className="text-center text-xs leading-relaxed text-[#9b8f7e]">
            <span className="font-semibold text-[#d3c4b2]/80">
              Alcohol is prohibited
            </span>{" "}
            in Gujarat, Bihar, Mizoram, Nagaland & Lakshadweep. This platform
            is for informational and community purposes only — it does not
            promote, sell, or deliver alcohol.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-[#9b8f7e]/50">
          Drink Responsibly
        </p>
      </div>
    </div>
  );
}
