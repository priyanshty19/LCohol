import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = process.cwd();

test("Android launches use a standalone in-scope PWA window", async () => {
  const manifest = JSON.parse(
    await readFile(`${root}/public/manifest.json`, "utf8"),
  );

  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.launch_handler?.client_mode, "navigate-existing");
});

test("the Android TWA verification file is public and matches the app", async () => {
  const assetLinks = JSON.parse(
    await readFile(`${root}/public/.well-known/assetlinks.json`, "utf8"),
  );
  const proxy = await readFile(`${root}/src/proxy.ts`, "utf8");

  assert.equal(assetLinks[0]?.target?.package_name, "com.sipstories.android");
  assert.deepEqual(assetLinks[0]?.relation, [
    "delegate_permission/common.handle_all_urls",
  ]);
  assert.match(proxy, /\\.well-known\/assetlinks\.json/);
});
