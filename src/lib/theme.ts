// Theme system — one [data-theme] attribute drives the whole palette + shader.
// `light` (Ivory Cream) is the default; `dark` is the Midnight Wine look; the
// six vibe themes mirror src/lib/vibe-config.ts hues.

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
    // A deliberate pick IS today's answer — otherwise choosing "Chill Session"
    // from the home rail at 9:00 still got you asked "What's the vibe today?"
    // at 9:05.
    markVibeChosenToday();
    // Fire-and-forget; the cookie already covers the unauthenticated case.
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// "Vibe chosen today" record.
//
// The daily vibe prompt asks once per CALENDAR DAY, keyed on the user's LOCAL
// date so the rollover is right per-user with no server cron or UTC math. It
// lives here (rather than inside daily-vibe.tsx) because onboarding also needs
// to stamp it: a vibe picked while creating the account IS that day's choice,
// and re-asking "What's the vibe today?" moments later is the bug this shares
// a fix with.
export const VIBE_DAY_COOKIE = "sip_vibe_day";

/** Local (NOT UTC) YYYY-MM-DD for the given instant. */
export function vibeDayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Record that a vibe choice has been made (or offered) for today, so the daily
 *  prompt does not ask again until the local date rolls over. */
export function markVibeChosenToday() {
  if (typeof document === "undefined") return;
  document.cookie = `${VIBE_DAY_COOKIE}=${vibeDayKey()}; path=/; max-age=31536000; samesite=lax`;
}

export function getActiveTheme(): ThemeId {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.dataset.theme;
  return isThemeId(t) ? t : "light";
}
