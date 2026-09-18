import { ChatGroq } from "@langchain/groq";

export function createJamesModel() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "qwen/qwen3.8-27b",
    temperature: 0.7,
    maxTokens: 1500,
    reasoningEffort: "none",
    timeout: 20_000,
    maxRetries: 1,
  });
}

export function jamesProviderFailure(error: unknown): { status: number; error: string; headers: Record<string, string> } {
  const failure = error as { status?: number; headers?: { get?: (name: string) => string | null } } | null;
  if (failure?.status === 429) {
    const wait = Number(failure.headers?.get?.("retry-after"));
    const retryAfter = Number.isFinite(wait) && wait > 0 ? Math.ceil(wait) : 5;
    return {
      status: 429,
      error: `James is receiving too many requests. Please retry in ${retryAfter} seconds.`,
      headers: { "Retry-After": String(retryAfter) },
    };
  }
  return {
    status: 502,
    error: "The AI service is temporarily unavailable. Please retry.",
    headers: {},
  };
}
