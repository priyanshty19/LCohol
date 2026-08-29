const RETURN_TO_BASE = "https://sipstories.invalid";
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/u;
const ENCODED_CONTROL_OR_BACKSLASH = /%(?:0[0-9a-f]|1[0-9a-f]|5c|7f)/iu;
const LOGIN_PATH = /^\/login(?:\/|$)/iu;

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function validateReturnTo(value: unknown): string | null {
  const candidate = firstString(value);
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    CONTROL_OR_BACKSLASH.test(candidate) ||
    ENCODED_CONTROL_OR_BACKSLASH.test(candidate)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate, RETURN_TO_BASE);
    const decodedPathname = decodeURIComponent(parsed.pathname);

    if (
      parsed.origin !== RETURN_TO_BASE ||
      decodedPathname.startsWith("//") ||
      CONTROL_OR_BACKSLASH.test(decodedPathname) ||
      LOGIN_PATH.test(decodedPathname)
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/**
 * Returns a same-site navigation target, or a safe fallback when the supplied
 * value could escape the app or send authentication back into the login flow.
 */
export function safeReturnTo(value: unknown, fallback: unknown = "/"): string {
  return validateReturnTo(value) ?? validateReturnTo(fallback) ?? "/";
}
