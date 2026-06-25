// Liquid colors for the Mix Lab. Resolution order:
//  1. a specific INGREDIENT color when the name/slug matches a known drink
//     (Cola → near-black, clear spirits → pale, orange juice → orange, …)
//  2. otherwise the category base HUE + a per-ingredient SHADE (hash of slug) so
//     same-category layers stay distinct.
// No color field exists on any model, so this client lookup is the source of truth.

export const CATEGORY_COLORS: Record<string, string> = {
  SPIRIT: "#b8862f",
  MIXER: "#cfe3ef",
  JUICE: "#e0822e",
  SYRUP: "#7a3b12",
  BITTERS: "#7e1f2b",
  GARNISH: "#3f7d63",
  ICE: "#cfe8f5",
  OTHER: "#8a7f6e",
};

// Keyword → hex, checked in order (put more specific terms first).
const INGREDIENT_COLORS: [string, string][] = [
  ["thums up", "#160b05"], ["coca", "#190d06"], ["cola", "#190d06"], ["pepsi", "#190d06"], ["root beer", "#1e0f06"],
  ["cold brew", "#241409"], ["espresso", "#1c0f06"], ["coffee", "#2a1606"], ["mocha", "#2a160b"], ["chocolate", "#2a160b"],
  ["red wine", "#5a0f1a"], ["white wine", "#e7d79a"], ["rose wine", "#e8a9a0"], ["port", "#46101b"], ["wine", "#6e1622"],
  ["stout", "#1c0f07"], ["dark beer", "#3a1e0a"], ["lager", "#d2a23e"], ["beer", "#c8912f"], ["cider", "#d6a93f"],
  ["bourbon", "#9c5418"], ["scotch", "#a5611f"], ["whisky", "#a5611f"], ["whiskey", "#a5611f"],
  ["dark rum", "#5a2e10"], ["aged rum", "#7a3e16"], ["white rum", "#eceee8"], ["rum", "#8a4a1e"],
  ["cognac", "#8a4516"], ["brandy", "#8a4516"], ["amaro", "#5a2418"], ["sherry", "#9c5a1e"],
  ["campari", "#b3122b"], ["aperol", "#e1591f"], ["grenadine", "#9e1230"], ["vermouth", "#caa45a"],
  ["blue curacao", "#1f6fb2"], ["curacao", "#1f6fb2"],
  ["orange juice", "#e8902a"], ["orange", "#e0822e"],
  ["cranberry", "#9e1b32"], ["pomegranate", "#8c1228"], ["beet", "#7a1438"], ["tomato", "#c02a1c"],
  ["pineapple", "#e3c33a"], ["mango", "#e9a72c"], ["passion", "#e0a52a"], ["peach", "#e8b87a"], ["apricot", "#e0a258"],
  ["grapefruit", "#e08a6a"], ["watermelon", "#e0556a"], ["strawberry", "#d83a52"], ["raspberry", "#b8243f"],
  ["blueberry", "#3a4a8a"], ["grape", "#5a2a6a"],
  ["green apple", "#a8c64a"], ["apple", "#cdd06a"],
  ["lime", "#a9c64a"], ["lemon", "#e6d24a"],
  ["mint", "#3f7d63"], ["matcha", "#4e7d3a"], ["basil", "#3f7d4f"], ["cucumber", "#9bc46a"],
  ["caramel", "#9c5a1e"], ["honey", "#c98f2a"], ["maple", "#9c5a1e"], ["vanilla", "#e8dcb0"],
  ["milk", "#f3ece0"], ["cream", "#f5eee2"], ["coconut", "#eef0ec"], ["yogurt", "#f3ece0"], ["almond", "#ecdcc0"],
  ["ginger ale", "#e3cf8e"], ["ginger beer", "#d8b257"], ["ginger", "#d8b257"],
  ["chai", "#b07a3a"], ["masala", "#a86a30"], ["tea", "#9c6b2e"],
  ["tonic", "#e9f1f5"], ["club soda", "#e9f1f5"], ["soda water", "#e9f1f5"], ["soda", "#e9f1f5"],
  ["sparkling", "#e9f1f5"], ["champagne", "#ecdca0"], ["prosecco", "#ecdca0"],
  ["vodka", "#eef1f5"], ["gin", "#eef1f5"], ["tequila", "#eef0e6"], ["sake", "#eef0e6"], ["absinthe", "#bcd86a"],
  ["bitters", "#7e1f2b"], ["angostura", "#7e1f2b"],
  ["sugar syrup", "#e8e2d2"], ["simple syrup", "#e8e2d2"], ["syrup", "#9c5a1e"],
  ["water", "#dfeaf0"], ["ice", "#cfe8f5"], ["salt", "#eef0ee"],
];

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("");
}
function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (t >= 0) return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  const k = 1 + t;
  return rgbToHex(r * k, g * k, b * k);
}
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Precompiled word-boundary matchers — so "ice" doesn't match "juice", "gin"
// doesn't match "virgin", etc. (raw substring matching mis-colored those).
const INGREDIENT_MATCHERS: [RegExp, string][] = INGREDIENT_COLORS.map(([kw, col]) => [
  new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
  col,
]);

export function colorFor(category: string | null | undefined, slug?: string | null, name?: string | null): string {
  const key = `${name ?? ""} ${(slug ?? "").replace(/-/g, " ")}`.toLowerCase();
  if (key.trim()) {
    for (const [re, col] of INGREDIENT_MATCHERS) {
      if (re.test(key)) return col;
    }
  }
  const base = (category && CATEGORY_COLORS[category.toUpperCase()]) || CATEGORY_COLORS.OTHER;
  if (!slug) return base;
  const t = (hashString(slug) / 0xffffffff) * 0.48 - 0.24;
  return shade(base, t);
}
