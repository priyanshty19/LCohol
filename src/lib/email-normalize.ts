// Canonical form of an email for IDENTITY lookups + storage.
//
// Always lowercase + trim. For Gmail (which treats the local part as
// dot-insensitive and ignores everything after "+"), strip dots and the +tag so
// "a.b+promo@gmail.com", "ab@googlemail.com" and "ab@gmail.com" all resolve to the
// SAME account. Without this, the same human typing their address with/without
// dots mints (or fails to find) separate accounts — the prod login bug.
//
// Non-Gmail domains keep their local part verbatim (only lower/trim) because dots
// are significant for most providers.

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function canonicalizeEmail(raw: string | null | undefined): string {
  const email = (raw ?? "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return email; // no domain — return as-is (validation handles it)

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  if (GMAIL_DOMAINS.has(domain)) {
    const plus = local.indexOf("+");
    if (plus !== -1) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
    domain = "gmail.com"; // googlemail.com is an alias of gmail.com
  }

  return `${local}@${domain}`;
}
