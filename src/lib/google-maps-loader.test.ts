import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, transpileModule } from "typescript";

test("the Maps loader shares requests and retries after a failed script", async () => {
  const scripts: { id: string; src: string; fail?: () => void }[] = [];
  let current: (typeof scripts)[number] | null = null;
  const window: { __sipStoriesMapsReady?: () => void } = {};
  const document = {
    getElementById: () => current,
    createElement: () => {
      const script = {
        id: "", src: "",
        addEventListener: (_event: string, callback: () => void) => { script.fail = callback; },
        remove: () => { current = null; },
        fail: undefined as (() => void) | undefined,
      };
      return script;
    },
    head: { appendChild: (script: (typeof scripts)[number]) => { current = script; scripts.push(script); } },
  };
  const exports: { loadGoogleMaps?: (key: string) => Promise<void> } = {};
  const code = transpileModule(readFileSync(new URL("./google-maps-loader.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, { exports, window, document });
  const load = exports.loadGoogleMaps!;
  const first = load("test-key");
  assert.equal(load("test-key"), first);
  assert.equal(scripts.length, 1);
  scripts[0].fail!();
  await assert.rejects(first, /Google Maps failed to load/);
  assert.equal(current, null);

  const retry = load("test-key");
  assert.equal(scripts.length, 2);
  window.__sipStoriesMapsReady!();
  await retry;
  assert.equal(window.__sipStoriesMapsReady, undefined);
  await load("test-key");
  assert.equal(scripts.length, 2);
});
