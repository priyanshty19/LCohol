"use client";

import { useEffect, useState } from "react";

/**
 * Single gate for heavy WebGL effects. Off for reduced-motion, data-saver,
 * small/mobile viewports, and low-core/low-memory devices. The static CSS
 * ambient (bg-ambient/bg-grain) is the fallback in every layout.
 */
export function useFxCapability() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const cores = nav.hardwareConcurrency ?? 4;
    const mem = nav.deviceMemory ?? 4;
    const save = nav.connection?.saveData ?? false;
    const small = window.innerWidth < 768;
    setEnabled(!reduce && !save && !small && cores >= 4 && mem >= 4);
  }, []);

  return enabled;
}
