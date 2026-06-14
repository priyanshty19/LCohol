"use client";

import { useEffect } from "react";
import { applyTheme, getActiveTheme, isThemeId } from "@/lib/theme";

/**
 * Renders nothing. The pre-paint <head> script (layout.tsx) already set
 * data-theme from the cookie (anti-FOUC). This reconciles with the DB after
 * mount so a theme chosen on another device wins. Unauthenticated → no-op.
 */
export function ThemeProvider() {
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const dbTheme = d?.user?.theme;
        if (alive && isThemeId(dbTheme) && dbTheme !== getActiveTheme()) {
          applyTheme(dbTheme); // no persist — DB is already the source
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
