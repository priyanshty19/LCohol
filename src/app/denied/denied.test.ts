import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GET as logout } from "../api/auth/logout/route";
import DeniedPage from "./page";

test("the denied-screen action clears the session before returning to login", async () => {
  const html = renderToStaticMarkup(DeniedPage());
  assert.match(html, /href="\/api\/auth\/logout"/);
  assert.match(html, />Sign out and return to login<\/a>/);

  const response = await logout(
    new Request("https://sipstories.test/api/auth/logout"),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://sipstories.test/login");

  const sessionCookie = response.headers.get("set-cookie") ?? "";
  assert.match(sessionCookie, /^ss_auth=;/);
  assert.match(sessionCookie, /Path=\//);
  assert.match(sessionCookie, /Max-Age=0/);
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /SameSite=lax/);
});
