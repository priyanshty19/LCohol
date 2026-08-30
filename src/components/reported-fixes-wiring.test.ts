import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("legacy recipe links resolve through the canonical cocktail fallback", () => {
  const cocktails = source("../lib/cocktails.ts");
  assert.match(cocktails, /startsWith: `\$\{slugOrId\}-`/);
  assert.match(cocktails, /orderBy: \{ createdAt: "desc" \}/);
});

test("drink and cocktail screens always render artwork and owners can replace mix photos", () => {
  const drinkDetail = source("./drinks/drink-detail.tsx");
  const entryCard = source("./catalog/entry-card.tsx");
  const cocktailDetail = source("./cocktails/cocktail-detail.tsx");
  const imageEditor = source("./cocktails/cocktail-image-editor.tsx");

  assert.match(drinkDetail, /DefaultDrinkArtwork/);
  assert.match(entryCard, /DefaultDrinkArtwork/);
  assert.match(cocktailDetail, /CocktailImageEditor/);
  assert.match(imageEditor, /\/api\/cocktails\/\$\{cocktailId\}\/image/);
  assert.match(imageEditor, /bottom-1\.5 right-1\.5/);
});

test("Bars, Cocktails, and My Drinks remain one discovery tab set", () => {
  const tabs = source("./catalog/catalog-tabs.tsx");
  assert.match(tabs, /href: "\/bars", label: "Bars"/);
  assert.match(tabs, /href: "\/cocktails", label: "Cocktails"/);
  assert.match(tabs, /href: "\/cocktails\/mine", label: "My Drinks"/);
});

test("public live parties are discoverable while invite-only parties stay gated", () => {
  const parties = source("../lib/parties.ts");
  const partyPage = source("../app/(main)/parties/[id]/page.tsx");
  assert.match(parties, /visibility: "PUBLIC"/);
  assert.match(parties, /status: "UPCOMING"/);
  assert.match(partyPage, /!isHost && !myInvite && party\.visibility !== "PUBLIC"/);
});

test("each vibe requests its own configured drink slugs", () => {
  const vibe = source("./vibe/vibe-view.tsx");
  assert.match(vibe, /slugs: vibe\.drinkSlugs\.join\(","\)/);
  assert.match(vibe, /vibe\.drinkSlugs\.indexOf\(a\.slug\)/);
});

test("the approved logo asset is the shared application mark", () => {
  const logo = source("./brand/logo.tsx");
  assert.match(logo, /\/brand\/sipstories-mark-dark\.png/);
});

test("James is draggable for the current session and resets after refresh", () => {
  const james = source("./james/james-widget.tsx");
  assert.match(james, /pointermove/);
  assert.match(james, /pointerup/);
  assert.match(james, /setLauncherPosition/);
  assert.doesNotMatch(james, /(?:localStorage|sessionStorage).*launcher/i);
});

test("the persisted Vesper recipe contains all three named gins", () => {
  const migration = source(
    "../../prisma/migrations/20260830151402_name_three_gin_vesper_ingredients/migration.sql",
  );
  assert.match(migration, /Stranger & Sons Gin/);
  assert.match(migration, /Hapusa Himalayan Dry Gin/);
  assert.match(migration, /Greater Than London Dry Gin/);
});
