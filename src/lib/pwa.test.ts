import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = process.cwd();

test("PWA manifest sends Android launches to the existing app client", async () => {
  const raw = await readFile(`${root}/public/manifest.json`, "utf8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.launch_handler?.client_mode, "navigate-existing");

  const installIcons = manifest.icons.filter((icon: { type?: string }) => icon.type === "image/png");
  assert.ok(installIcons.length >= 2, "installable manifest needs PNG icons");
  await Promise.all(
    installIcons.map(async (icon: { src: string }) => {
      const relative = icon.src.replace(/^\//, "");
      await access(`${root}/public/${relative}`).catch(() =>
        access(`${root}/src/app/${relative}/route.tsx`),
      );
    }),
  );
});

test("root metadata explicitly enables Apple Home Screen app mode", async () => {
  const layout = await readFile(`${root}/src/app/layout.tsx`, "utf8");

  assert.match(layout, /appleWebApp:\s*\{/);
  assert.match(layout, /capable:\s*true/);
  assert.match(layout, /title:\s*"Sip Stories"/);
});

test("public Android and PWA bootstrap files bypass authentication", async () => {
  const proxy = await readFile(`${root}/src/proxy.ts`, "utf8");

  for (const file of ["manifest.json", "sw.js", "offline.html", ".well-known/assetlinks.json"]) {
    assert.equal(proxy.includes(file), true, `${file} must be public`);
  }
});

test("service worker never caches authenticated pages or API responses", async () => {
  const worker = await readFile(`${root}/public/sw.js`, "utf8");

  assert.match(worker, /event\.request\.mode !== "navigate"/);
  assert.match(worker, /fetch\(event\.request\)\.catch/);
  assert.doesNotMatch(worker, /cache\.put\(event\.request/);
});
