import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync(new URL("./native-push-client.ts", import.meta.url), "utf8");
const header = readFileSync(
  new URL("../components/layout/header.tsx", import.meta.url),
  "utf8",
);

test("native device tokens are removed from the account before logout", () => {
  assert.match(helper, /method: "DELETE"/);
  assert.match(helper, /localStorage\.removeItem/);
  assert.match(header, /await removeNativePushTokenForLogout/);
  assert.ok(
    header.indexOf("await removeNativePushTokenForLogout") <
      header.indexOf('fetch("/api/auth/logout"'),
  );
});
