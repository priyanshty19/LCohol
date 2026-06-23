import Link from "next/link";

const MENTION_RE = /@([a-zA-Z0-9_]{2,30})/g;

// Render plain text with @usernames turned into profile links. Returns React
// nodes; use inline as {renderMentions(body)}. Safe in server components.
export function renderMentions(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const username = m[1];
    parts.push(
      <Link
        key={`m${i++}`}
        href={`/profile/${username}`}
        className="font-medium text-primary hover:underline"
      >
        @{username}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}
