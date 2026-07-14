const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "can", "could", "for", "from", "have", "how", "i've", "just", "like", "make", "please", "should", "that", "the", "this", "what", "with", "would", "you", "your",
]);

// Compact, deterministic signals from a guest's latest James question. We keep
// the raw question separately for the existing interaction audit trail.
export function jamesKeywords(message: string): string[] {
  return [...new Set(
    message
      .toLowerCase()
      .match(/[a-z][a-z'-]{2,}/g)
      ?.filter((word) => !STOP_WORDS.has(word)) ?? [],
  )].slice(0, 8);
}
