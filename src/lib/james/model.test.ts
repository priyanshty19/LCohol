import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { NextRequest, NextResponse } from "next/server";
import * as messages from "@langchain/core/messages";
import { stripReasoning } from "./reasoning";
import { jamesProviderFailure } from "./model";
import { THEMES, isThemeId } from "../theme";
import { NAV_TARGETS } from "./actions";

function load<T>(url: URL, modules: Record<string, unknown>): T {
  const exports = {} as T;
  const code = transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    exports, process: { env: { GROQ_API_KEY: "test-key" } },
    TextEncoder, ReadableStream, Response,
    console: { error() {}, warn() {} },
    require(name: string) {
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    },
  });
  return exports;
}

test("both James endpoints share the available model and 1500-token budget", () => {
  let config: Record<string, unknown> = {};
  const loaded = load<{ createJamesModel: () => unknown }>(new URL("./model.ts", import.meta.url), {
    "@langchain/groq": { ChatGroq: class { constructor(options: Record<string, unknown>) { config = options; } } },
  });
  loaded.createJamesModel();
  assert.equal(config.model, "qwen/qwen3.8-27b");
  assert.equal(config.maxTokens, 1500);
  assert.equal(config.reasoningEffort, "none");
  assert.equal(config.timeout, 20000);
  assert.equal(config.maxRetries, 1);
  for (const kind of ["agent", "chat"]) {
    const source = readFileSync(new URL(`../../app/api/james/${kind}/route.ts`, import.meta.url), "utf8");
    assert.ok(source.includes("const model = createJamesModel()"));
    assert.ok(!source.includes("pulled away"));
  }
});

function handler(kind: "agent" | "chat", options: { failure?: "initial" | "middle"; unauthorized?: boolean; rateLimited?: boolean } = {}) {
  function fail() {
    if (options.rateLimited) throw { status: 429, headers: new Headers({ "retry-after": "2" }) };
    if (options.failure) throw new Error("Provider unavailable");
  }
  const model = {
    invoke: async () => {
      fail();
      return { content: '<think>hidden</think>Hello.\n%%ACTION%% {"type":"navigate","page":"hangover"}' };
    },
    stream: async () => (async function* () {
      if (options.rateLimited) fail();
      if (options.failure === "initial") throw new Error("Model unavailable");
      yield { content: "Hello. " };
      if (options.failure === "middle") throw new Error("Connection interrupted");
      yield { content: "How can I help?" };
    })(),
  };
  const loaded = load<{ POST: (request: NextRequest) => Promise<Response> }>(new URL(`../../app/api/james/${kind}/route.ts`, import.meta.url), {
    "next/server": { NextResponse },
    "@langchain/core/messages": messages,
    "@/lib/james/model": { createJamesModel: () => model, jamesProviderFailure },
    "@/lib/auth": { getCurrentUser: async () => options.unauthorized ? null : { id: "fixture", profile: {} } },
    "@/lib/prisma": { prisma: {} },
    "@/lib/rate-limit": { rateLimit: async () => true },
    "@/lib/db-errors": { isPoolExhausted: () => false },
    "@/lib/james/retriever": { retrieveDrinks: async () => [] },
    "@/lib/james/persona": { buildSystemPrompt: () => "You are James." },
    "@/lib/behavior": { getTasteProfile: async () => ({ recentDrinks: [], topCategories: [], keywords: [] }) },
    "@/lib/interactions": { logInteraction() {} },
    "@/lib/james/search": { searchCatalog: async () => null },
    "@/lib/james/actions": { NAV_TARGETS },
    "@/lib/james/keywords": { jamesKeywords: () => [] },
    "@/lib/james/reasoning": { stripReasoning },
    "@/lib/theme": { THEMES, isThemeId },
  });
  return () => loaded.POST(new NextRequest(`https://sipstories.test/api/james/${kind}`, {
    method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
  })) as Promise<Response>;
}

test("agent returns a clean answer with a validated navigation action", async () => {
  const response = await handler("agent")();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.reply, "Hello.");
  assert.equal(data.actions[0].path, NAV_TARGETS.hangover.path);
});

test("agent provider failure is a non-success response", async () => {
  const response = await handler("agent", { failure: "initial" })();
  assert.equal(response.status, 502);
  assert.ok((await response.json()).error);
});

test("streaming chat returns the complete answer", async () => {
  const response = await handler("chat")();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Hello. How can I help?");
});

test("stream startup failure returns 502 rather than a fake assistant reply", async () => {
  const response = await handler("chat", { failure: "initial" })();
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /temporarily unavailable/);
});

test("interrupted streams fail instead of appending an excuse", async () => {
  const response = await handler("chat", { failure: "middle" })();
  await assert.rejects(response.text(), /Connection interrupted/);
});

test("both endpoints still require authentication", async () => {
  for (const kind of ["agent", "chat"] as const) {
    assert.equal((await handler(kind, { unauthorized: true })()).status, 401);
  }
});

test("both endpoints preserve provider rate limits with a clear retry time", async () => {
  for (const kind of ["agent", "chat"] as const) {
    const response = await handler(kind, { rateLimited: true })();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "2");
    assert.match((await response.json()).error, /retry in 2 seconds/);
  }
  assert.equal(jamesProviderFailure({ status: 429 }).headers["Retry-After"], "5");
  assert.equal(jamesProviderFailure({ status: 429, headers: new Headers({ "retry-after": "120" }) }).headers["Retry-After"], "120");
});

test("error bubbles do not get sent back as model conversation history", () => {
  for (const file of ["ask-james", "james-widget"]) {
    const source = readFileSync(new URL(`../../components/james/${file}.tsx`, import.meta.url), "utf8");
    assert.match(source, /\.filter\(\(m\) => [^\n]*!m\.isError\)/);
  }
});
