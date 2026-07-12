"use client";

import { useState, useEffect } from "react";
import { getCookie, setCookie } from "@/lib/client-cookies";
import { GEO_COOKIE } from "./age-gate-overlay";

const MESSAGE =
  "Alcohol laws vary by state in India. Alcohol is prohibited in Gujarat, Bihar, Mizoram, Nagaland, and Lakshadweep. " +
  "This platform is for informational and community purposes only and does not promote, sell, or deliver alcohol.";

export function GeoDisclaimer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wasDismissed = getCookie(GEO_COOKIE);
    if (wasDismissed) return;

    const t = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-4 md:inset-x-auto md:right-5 md:bottom-5 md:w-[min(30rem,calc(100vw-2rem))]">
      <div className="animate-in fade-in slide-in-from-bottom-3 rounded-xl border border-amber-500/20 bg-amber-950/85 p-4 shadow-xl shadow-black/25 backdrop-blur-md duration-500">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg leading-none text-amber-400">i</span>
          <div className="flex-1">
            <p className="text-sm text-amber-100/90">{MESSAGE}</p>
            <p className="mt-1 text-xs text-amber-200/60">
              Drink responsibly. Content on this platform represents user
              opinions, not professional advice.
            </p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              setCookie(GEO_COOKIE, "1");
              fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ geoDismissed: true }),
              }).catch(() => {});
            }}
            className="shrink-0 rounded px-2 py-1 text-xs text-amber-300 hover:bg-amber-900/50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
