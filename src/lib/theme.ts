// Theme system — one [data-theme] attribute drives the whole palette + shader.
// `dark` is the default Sip Stories wine look; `light` is its cream inverse;
// the six vibe themes mirror src/lib/vibe-config.ts hues.

export type ThemeId =
  | "dark"
  | "light"
  | "party"
  | "chill"
  | "date-night"
  | "celebrate"
  | "solo"
  | "budget";

export const THEME_COOKIE = "sip_theme";

export const THEMES: { id: ThemeId; label: string; emoji: string; group: "base" | "vibe" }[] = [
  { id: "light", label: "Ivory Cream", emoji: "🥂", group: "base" },
  { id: "dark", label: "Midnight Wine", emoji: "🍷", group: "base" },
  { id: "party", label: "Party Mode", emoji: "🎉", group: "vibe" },
  { id: "chill", label: "Chill Session", emoji: "🌙", group: "vibe" },
  { id: "date-night", label: "Date Night", emoji: "🕯️", group: "vibe" },
  { id: "celebrate", label: "Celebration", emoji: "🥂", group: "vibe" },
  { id: "solo", label: "Solo Wind-down", emoji: "🪑", group: "vibe" },
  { id: "budget", label: "Budget Night", emoji: "💸", group: "vibe" },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

/** Maps a /vibe id (vibe-config) to its theme id. They share ids today, but
 *  keep this indirection so the two can diverge without breaking callers. */
export function vibeToTheme(vibeId: string): ThemeId {
  return (THEME_IDS.has(vibeId as ThemeId) ? vibeId : "dark") as ThemeId;
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.has(value as ThemeId);
}

/** Apply a theme to the document, mirror to a 1-year cookie (anti-FOUC on the
 *  next load), and optionally persist to the DB for cross-device sync. */
export function applyTheme(theme: ThemeId, opts: { persist?: boolean } = {}) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.dataset.theme = theme;
  // Keep the dark/light class in lockstep so dark: utilities only fire on
  // dark-family themes (light must NOT carry .dark).
  el.classList.toggle("dark", theme !== "light");
  el.classList.toggle("light", theme === "light");
  // Cookie mirror — read by the pre-paint script so the next load paints right.
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));

  if (opts.persist) {
    // Fire-and-forget; the cookie already covers the unauthenticated case.
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch(() => {});
  }
}

export function getActiveTheme(): ThemeId {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.dataset.theme;
  return isThemeId(t) ? t : "light";
}
