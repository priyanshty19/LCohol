import Link from "next/link";

// @username mentions, and INTERNAL app paths we trust to linkify (relative,
// app-owned routes only — never arbitrary user-supplied external URLs, which
// would be a phishing vector). Matched together so a single pass over the text
// turns both into links without nesting.
const TOKEN_RE =
  /(@[a-zA-Z0-9_]{2,30})|(\/(?:cocktails|drinks|bars|profile|post|parties)\/[a-zA-Z0-9_-]+)/g;

// Friendly link labels per internal section, so a post reads "… View recipe →"
// instead of exposing a raw "/cocktails/uuid-slug" path.
const PATH_LABELS: Record<string, string> = {
  cocktails: "View recipe →",
  drinks: "View drink →",
  bars: "View bar →",
  parties: "View party →",
  post: "View post →",
};

/**
 * Render plain post text with @usernames and trusted internal paths turned into
 * links. Returns React nodes; use inline as {renderMentions(body)}. Server-safe.
 */
export function renderMentions(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));

    if (m[1]) {
      // @mention → profile link
      const username = m[1].slice(1);
      parts.push(
        <Link
          key={`m${i++}`}
          href={`/profile/${username}`}
          className="font-medium text-primary hover:underline"
        >
          @{username}
        </Link>,
      );
    } else {
      // internal path → friendly labelled link
      const path = m[2];
      const section = path.split("/")[1];
      const label = section === "profile" ? path : PATH_LABELS[section] ?? path;
      parts.push(
        <Link
          key={`m${i++}`}
          href={path}
          className="font-medium text-primary hover:underline"
        >
          {label}
        </Link>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}
