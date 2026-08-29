export type AnalyticsConsent = "granted" | "denied";
export const ANALYTICS_CONSENT_EVENT = "sipstories:analytics-consent";

export type InitialAnalyticsConsent = {
  consent: AnalyticsConsent | null;
  shouldPrompt: boolean;
  shouldPersistCookieToAccount: boolean;
};

export function normalizeAnalyticsConsent(value: unknown): AnalyticsConsent | null {
  return value === "granted" || value === "denied" ? value : null;
}

export function resolveInitialAnalyticsConsent(
  accountConsent: AnalyticsConsent | null,
  cookieConsent: AnalyticsConsent | null,
  authenticated: boolean,
): InitialAnalyticsConsent {
  if (accountConsent) {
    return {
      consent: accountConsent,
      shouldPrompt: false,
      shouldPersistCookieToAccount: false,
    };
  }

  if (cookieConsent) {
    return {
      consent: cookieConsent,
      shouldPrompt: false,
      shouldPersistCookieToAccount: authenticated,
    };
  }

  return {
    consent: null,
    shouldPrompt: true,
    shouldPersistCookieToAccount: false,
  };
}
