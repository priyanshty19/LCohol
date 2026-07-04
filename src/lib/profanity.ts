// Lightweight profanity guard for short, PUBLIC user-authored text — cocktail
// names, and reusable for post titles / display names. Not a comprehensive
// moderation system (the Report flow handles the long tail); this blocks the
// blatant, high-severity terms that must never render publicly on the app.
//
// Design goals:
//  - Catch obvious evasions: leetspeak (f4ck), spacing/punctuation (f-u-c-k),
//    repeated letters (fuuuck).
//  - Avoid the Scunthorpe problem: severe slurs match as substrings, but common
//    profanities match only as whole normalized WORDS, so "assassin",
//    "cocktail", "class" etc. are not flagged.

// Whole-word matches (checked against normalized, space-separated tokens).
const WORD_BLOCKLIST = new Set([
  "fuck", "fucker", "fucking", "motherfucker",
  "shit", "bullshit", "bitch", "bastard", "asshole",
  "cunt", "dick", "pussy", "cock", "whore", "slut",
  "wank", "wanker", "twat", "prick", "bollocks",
]);

// Severe slurs — matched even as substrings (no legitimate use in a drink name).
const SUBSTRING_BLOCKLIST = [
  "nigger", "nigga", "faggot", "retard", "chink", "spic", "kike", "paki",
];

// Collapse common leetspeak and de-dupe repeated letters so evasions normalize
// to their base form. e.g. "F.u.c.k.e.r!!" → "fucker", "sh1t" → "shit".
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3€]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]+/g, " ") // strip punctuation/digits → word boundaries
    .replace(/(.)\1{2,}/g, "$1$1") // "fuuuuck" → "fuuck" (keep doubles like "ss")
    .trim();
}

/** True if the text contains blatant profanity or a slur (after evasion-normalization). */
export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  const norm = normalize(text);
  if (!norm) return false;

  // Substring pass (slurs) — also check the space-stripped form so "n i g g a"
  // can't slip through.
  const compact = norm.replace(/ /g, "");
  for (const term of SUBSTRING_BLOCKLIST) {
    if (compact.includes(term)) return true;
  }

  // Whole-word pass (common profanity) — avoids flagging substrings like "class".
  const tokens = norm.split(" ");
  const isWordBlocked = (w: string) =>
    // Fold a stray doubled letter back ("fuuck" → "fuck") for the lookup.
    WORD_BLOCKLIST.has(w) || WORD_BLOCKLIST.has(w.replace(/(.)\1+/g, "$1"));

  for (const tok of tokens) {
    if (isWordBlocked(tok)) return true;
  }

  // Spelled-out evasion ("f u c k e r", "F.U.C.K"): join RUNS of consecutive
  // single-letter tokens and re-check as whole words. Safe against Scunthorpe —
  // it only concatenates letters the user already separated, so "rum"/"gin"-style
  // real words are unaffected, and multi-letter tokens never merge.
  let run: string[] = [];
  for (const tok of [...tokens, ""]) {
    if (tok.length === 1) {
      run.push(tok);
    } else {
      if (run.length >= 3 && isWordBlocked(run.join(""))) return true;
      run = [];
    }
  }

  return false;
}
