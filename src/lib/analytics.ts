import { getCookie } from "@/lib/client-cookies";

export const ANALYTICS_CONSENT_COOKIE = "sip_analytics_consent";
export const OPEN_ANALYTICS_CHOICES_EVENT = "sipstories:open-analytics-choices";

export type AnalyticsConsent = "granted" | "denied";
export type AnalyticsValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsValue | undefined>;

type PendingEvent = {
  name: string;
  params: Record<string, AnalyticsValue>;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __sipAnalyticsReady?: boolean;
    __sipAnalyticsMeasurementId?: string;
    __sipAnalyticsPending?: PendingEvent[];
  }
}

const DYNAMIC_ROUTES: Array<[RegExp, string]> = [
  [/^\/party\/[^/]+(?:\/.*)?$/, "/party/[code]"],
  [/^\/parties\/[^/]+(?:\/.*)?$/, "/parties/[id]"],
  [/^\/post\/[^/]+(?:\/.*)?$/, "/post/[id]"],
  [/^\/profile\/[^/]+(?:\/.*)?$/, "/profile/[username]"],
  [/^\/drinks\/[^/]+(?:\/.*)?$/, "/drinks/[id]"],
  [/^\/bars\/[^/]+(?:\/.*)?$/, "/bars/[slug]"],
  [/^\/cocktails\/[^/]+(?:\/.*)?$/, "/cocktails/[slug]"],
];

/**
 * Remove query strings and replace user/content identifiers before a URL is
 * sent to Google. This prevents referral codes, usernames, search terms and
 * private object IDs from becoming Analytics dimensions.
 */
export function sanitizeAnalyticsPath(input: string): string {
  const rawPath = input.split(/[?#]/, 1)[0] || "/";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  for (const [pattern, replacement] of DYNAMIC_ROUTES) {
    if (pattern.test(path)) return replacement;
  }

  return path;
}

const SAFE_PAGE_TITLES: Record<string, string> = {
  "/": "Feed",
  "/login": "Welcome",
  "/signup": "Create account",
  "/onboarding": "Onboarding",
  "/party/[code]": "Private party invitation",
  "/parties/[id]": "Party details",
  "/post/[id]": "Post details",
  "/profile/[username]": "Member profile",
  "/drinks/[id]": "Drink details",
  "/bars/[slug]": "Bar details",
  "/cocktails/[slug]": "Cocktail details",
};

export function safeAnalyticsPageTitle(pathname: string): string {
  const path = sanitizeAnalyticsPath(pathname);
  if (SAFE_PAGE_TITLES[path]) return SAFE_PAGE_TITLES[path];

  const label = path
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  return label || "Sip Stories";
}

function sanitizedReferrer(): string {
  if (typeof document === "undefined" || !document.referrer) return "";

  try {
    const referrer = new URL(document.referrer);
    return `${referrer.origin}${sanitizeAnalyticsPath(referrer.pathname)}`;
  } catch {
    return "";
  }
}

function pageContext(pathname: string, title?: string) {
  const path = sanitizeAnalyticsPath(pathname);
  const origin = typeof window === "undefined" ? "https://mysipstories.com" : window.location.origin;
  return {
    page_path: path,
    page_location: `${origin}${path}`,
    page_referrer: sanitizedReferrer(),
    page_title: title ?? safeAnalyticsPageTitle(path),
  };
}

export function getAppSurface(): "web" | "pwa" | "android_twa" | "ios_webview" {
  if (typeof window === "undefined") return "web";

  if (document.referrer.startsWith("android-app://")) return "android_twa";
  if (/SipStoriesIOS/i.test(navigator.userAgent)) return "ios_webview";
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  ) {
    return "pwa";
  }

  return "web";
}

export function hasAnalyticsConsent(): boolean {
  return getCookie(ANALYTICS_CONSENT_COOKIE) === "granted";
}

export function ensureGoogleTagQueue() {
  if (typeof window === "undefined") return;
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
}

function cleanParams(params: AnalyticsParams): Record<string, AnalyticsValue> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, AnalyticsValue] => {
      const value = entry[1];
      return value !== undefined && ["string", "number", "boolean"].includes(typeof value);
    }),
  );
}

function sendEvent(name: string, params: Record<string, AnalyticsValue>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, {
    ...pageContext(window.location.pathname),
    ...params,
    app_surface: getAppSurface(),
    ...(window.__sipAnalyticsMeasurementId
      ? { send_to: window.__sipAnalyticsMeasurementId }
      : {}),
  });
}

export function configureGoogleAnalytics(measurementId: string) {
  if (typeof window === "undefined") return;
  if (
    window.__sipAnalyticsReady &&
    window.__sipAnalyticsMeasurementId === measurementId
  ) {
    return;
  }
  ensureGoogleTagQueue();
  window.__sipAnalyticsMeasurementId = measurementId;
  window.gtag?.("js", new Date());
  window.gtag?.("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...pageContext(window.location.pathname),
  });
  window.__sipAnalyticsReady = true;

  const pending = window.__sipAnalyticsPending ?? [];
  window.__sipAnalyticsPending = [];
  for (const event of pending) sendEvent(event.name, event.params);
}

export function trackAnalyticsEvent(name: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;

  const event = {
    name,
    params: cleanParams(params),
  };

  if (!window.__sipAnalyticsReady) {
    window.__sipAnalyticsPending ??= [];
    window.__sipAnalyticsPending.push(event);
    return;
  }

  sendEvent(event.name, event.params);
}

export function trackPageView(pathname: string, title?: string) {
  const context = pageContext(pathname, title);
  if (typeof window !== "undefined") window.gtag?.("set", context);

  trackAnalyticsEvent("page_view", {
    ...context,
  });
}

/** Track a UI state that behaves like a screen without changing the URL. */
export function trackVirtualPageView(pathname: string, title: string) {
  trackPageView(pathname, title);
}
