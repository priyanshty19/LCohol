"use client";

import { useState, useEffect } from "react";
import { PROHIBITION_STATES, RESTRICTIVE_STATES } from "@/lib/constants";

export function GeoDisclaimer() {
  const [dismissed, setDismissed] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("geo_disclaimer_dismissed");
    if (wasDismissed) return;

    setDismissed(false);
    setMessage(
      "Alcohol laws vary by state in India. Alcohol is prohibited in Gujarat, Bihar, Mizoram, Nagaland, and Lakshadweep. " +
        "This platform is for informational and community purposes only and does not promote, sell, or deliver alcohol."
    );
  }, []);

  if (dismissed || !message) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-4 md:bottom-4">
      <div className="mx-auto max-w-2xl rounded-lg border border-amber-500/20 bg-amber-950/90 p-4 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-amber-400 text-lg">i</span>
          <div className="flex-1">
            <p className="text-sm text-amber-100/90">{message}</p>
            <p className="mt-1 text-xs text-amber-200/60">
              Drink responsibly. Content on this platform represents user
              opinions, not professional advice.
            </p>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("geo_disclaimer_dismissed", "true");
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
