// Tiny client-side cookie helpers. Used for state that must persist across
// sessions (and survive a tab close) without a logged-in user — age gate, geo
// disclaimer, pricing-state preference. Replaces session/localStorage so
// nothing "disappears" on the user. Default lifetime: 1 year.

const ONE_YEAR = 60 * 60 * 24 * 365;

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.*+?^${}()|[\]\\])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds = ONE_YEAR) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}
