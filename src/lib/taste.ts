import type { Vector } from "@/lib/signals/content";

type ProfileTasteInput = {
  preferredSpirits?: string[] | null;
  preferredFlavours?: string[] | null;
  intensity?: string | null;
  intent?: string | null;
} | null | undefined;

const DRINK_TOKENS: Record<string, string[]> = {
  whisky: ["cat:Whisky"],
  rum: ["cat:Rum"],
  gin: ["cat:Gin"],
  "gin-tonic": ["cat:Gin"],
  vodka: ["cat:Vodka"],
  "vodka-cocktails": ["cat:Vodka"],
  tequila: ["cat:Tequila"],
  beer: ["cat:Beer"],
  wine: ["cat:Wine"],
  brandy: ["cat:Brandy"],
  liqueur: ["cat:Liqueur"],
  mocktails: ["cat:Soft Drinks"],
  coke: ["cat:Soft Drinks", "sub:Cola"],
  "diet-coke": ["cat:Soft Drinks", "sub:Cola"],
  "fresh-juice": ["cat:Soft Drinks"],
  "alcohol-free": ["pref:alcohol-free"],
};

const FLAVOUR_TOKENS: Record<string, string[]> = {
  Sweet: ["flavour:sweet"],
  Sour: ["flavour:sour"],
  Bitter: ["flavour:bitter"],
  Smoky: ["flavour:smoky"],
  "Spicy / Chilli": ["flavour:spicy"],
  Fruity: ["flavour:fruity"],
  Citrus: ["flavour:sour", "flavour:fruity"],
  Mango: ["flavour:fruity"],
  Jamun: ["flavour:fruity"],
  Peach: ["flavour:fruity"],
  Minty: ["flavour:floral"],
};

const STYLE_TOKENS: Record<string, string[]> = {
  familiar: [],
  balanced: [],
  adventurous: ["mood:ADVENTUROUS"],
  taste: [],
  couple: [],
  "all-in": ["mood:ENERGETIC"],
};

const SETTING_TOKENS: Record<string, string[]> = {
  quiet: ["mood:RELAXED"],
  social: ["mood:ENERGETIC"],
  out: ["mood:CELEBRATORY"],
  party: ["mood:ENERGETIC", "mood:CELEBRATORY"],
  chill: ["mood:RELAXED"],
  "date-night": ["mood:ROMANTIC"],
  celebrate: ["mood:CELEBRATORY"],
  solo: ["mood:RELAXED"],
  budget: ["mood:ENERGETIC"],
  buzz: ["mood:ENERGETIC"],
  zone: ["mood:RELAXED"],
};

const LABELS: Record<string, string> = {
  "cat:Soft Drinks": "soft drinks",
  "sub:Cola": "cola",
  "flavour:sweet": "sweet flavours",
  "flavour:sour": "citrusy flavours",
  "flavour:bitter": "bitter flavours",
  "flavour:smoky": "smoky flavours",
  "flavour:spicy": "spicy flavours",
  "flavour:fruity": "fruity flavours",
  "flavour:floral": "fresh flavours",
  "mood:RELAXED": "relaxed plans",
  "mood:ENERGETIC": "social plans",
  "mood:CELEBRATORY": "celebrations",
  "mood:ADVENTUROUS": "trying new things",
  "pref:alcohol-free": "alcohol-free options",
};

function add(vector: Vector, tokens: string[], weight: number) {
  for (const token of tokens) vector[token] = (vector[token] ?? 0) + weight;
}

// Explicit profile choices seed a useful taste vector before activity exists.
export function profileTasteVector(profile: ProfileTasteInput): Vector {
  const vector: Vector = {};
  const choices = profile?.preferredSpirits ?? [];
  for (const choice of choices) add(vector, DRINK_TOKENS[choice] ?? [], 4);
  if (choices.length && choices.every((choice) => ["mocktails", "coke", "diet-coke", "fresh-juice", "alcohol-free"].includes(choice))) {
    add(vector, ["pref:alcohol-free"], 4);
  }
  for (const flavour of profile?.preferredFlavours ?? []) add(vector, FLAVOUR_TOKENS[flavour] ?? [], 3);
  add(vector, STYLE_TOKENS[profile?.intensity ?? ""] ?? [], 2);
  add(vector, SETTING_TOKENS[profile?.intent ?? ""] ?? [], 2);
  return vector;
}

export function topTasteKeywords(vector: Vector, take = 8): string[] {
  return Object.entries(vector)
    .filter(([token]) => token.startsWith("cat:") || token.startsWith("flavour:") || token.startsWith("mood:") || token === "pref:alcohol-free")
    .sort(([, a], [, b]) => b - a)
    .map(([token]) => LABELS[token] ?? token.slice(token.indexOf(":") + 1))
    .filter((label, index, all) => all.indexOf(label) === index)
    .slice(0, take);
}
