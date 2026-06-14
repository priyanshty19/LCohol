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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#FAF7F2]/95 backdrop-blur-xl" />

      {/* Content */}
      <div
        className={`relative z-10 mx-6 w-full max-w-md transition-all duration-400 ${
          exiting ? "translate-y-4 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        {/* Logo area */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-semibold tracking-wide text-[#B5720A]"
            style={{ fontFamily: "EB Garamond, Georgia, serif" }}
          >
            SIPSTORIES
          </h1>
          <p className="mt-1 text-sm text-[#7A6550]">
            Stories worth sipping on
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E5D5B5] bg-white p-8 shadow-xl shadow-[#B5720A]/8">
          {/* 21+ badge */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#B5720A]/40 bg-[#B5720A]/10">
            <span
              className="text-3xl font-bold text-[#B5720A]"
              style={{ fontFamily: "EB Garamond, Georgia, serif" }}
            >
              21+
            </span>
          </div>

          <h2
            className="text-center text-xl font-medium text-[#1C1208]"
            style={{ fontFamily: "EB Garamond, Georgia, serif" }}
          >
            Age Verification
          </h2>

          <p className="mt-3 text-center text-sm leading-relaxed text-[#7A6550]">
            You must be 21 years or older to access SIPSTORIES. This platform
            contains alcohol-related content intended for adults of legal
            drinking age in India.
          </p>

          {/* Buttons */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleAccept}
              className="w-full rounded-full bg-[#B5720A] px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#FFF8EC] transition-all duration-200 hover:bg-[#9A5F08] hover:shadow-lg hover:shadow-[#B5720A]/20 active:scale-[0.98]"
            >
              I am 21+ — Enter
            </button>
            <button
              onClick={handleDecline}
              className="w-full rounded-full border border-[#E5D5B5] px-6 py-3 text-sm font-medium text-[#7A6550] transition-colors hover:border-[#C4A882] hover:text-[#5C4830]"
            >
              I am under 21
            </button>
          </div>
        </div>

        {/* Prohibition states disclaimer */}
        <div className="mt-6 rounded-xl border border-[#E5D5B5] bg-[#F5EDD8] px-5 py-4">
          <p className="text-center text-xs leading-relaxed text-[#7A6550]">
            <span className="font-semibold text-[#5C4830]">
              Alcohol is prohibited
            </span>{" "}
            in Gujarat, Bihar, Mizoram, Nagaland & Lakshadweep. This platform
            is for informational and community purposes only — it does not
            promote, sell, or deliver alcohol.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-[#C4A882]">
          Drink Responsibly
        </p>
      </div>
    </div>
  );
}
