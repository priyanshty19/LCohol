export type GarnishId = "umbrella" | "orange" | "lemon" | "cherry" | "mint" | "salt";

export type GarnishDef = { id: GarnishId; label: string; emoji: string };

export const GARNISHES: GarnishDef[] = [
  { id: "umbrella", label: "Cocktail umbrella", emoji: "🌂" },
  { id: "orange", label: "Orange slice", emoji: "🍊" },
  { id: "lemon", label: "Lemon twist", emoji: "🍋" },
  { id: "cherry", label: "Cherry", emoji: "🍒" },
  { id: "mint", label: "Mint sprig", emoji: "🌿" },
  { id: "salt", label: "Salt rim", emoji: "🧂" },
];
