/**
 * Qwen is a reasoning model: it narrates its thinking inside <think> tags before
 * the actual answer. `reasoningEffort: "none"` is meant to switch that off, but
 * Groq only documents it for qwen3-32b, so this is the guarantee the guest never
 * reads James thinking out loud.
 */
export function stripReasoning(raw: string): string {
  return (
    raw
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      // Opened but never closed, i.e. reasoning ran into the token cap. Dropping
      // the tail leaves an empty reply, which the caller turns into a fallback
      // line — better than shipping raw reasoning.
      .replace(/<think>[\s\S]*$/i, "")
      // Closed but never opened.
      .replace(/^[\s\S]*?<\/think>/i, "")
      .trim()
  );
}
