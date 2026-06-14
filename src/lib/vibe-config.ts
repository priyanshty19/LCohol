export type Vibe = {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  gradient: string;
  drinkSlugs: string[];   // preferred drinks for this vibe
  cocktailVibes: string[]; // maps to CocktailRecipe.vibes
  tags: string[];
};

export const VIBES: Vibe[] = [
  {
    id: "party",
    label: "Party Mode",
    emoji: "🎉",
    tagline: "Full volume, no regrets",
    gradient: "from-orange-500/20 to-yellow-500/20",
    drinkSlugs: ["bira-91-white", "kingfisher-premium", "royal-stag", "magic-moments", "smirnoff-21"],
    cocktailVibes: ["party"],
    tags: ["party-mode", "house-party", "celebration"],
  },
  {
    id: "chill",
    label: "Chill Session",
    emoji: "🌙",
    tagline: "Low key, high vibes",
    gradient: "from-blue-500/20 to-indigo-500/20",
    drinkSlugs: ["old-monk", "greater-than-gin", "bira-91-blonde", "sula-sauvignon-blanc"],
    cocktailVibes: ["chill"],
    tags: ["chill-vibes", "house-party"],
  },
  {
    id: "date-night",
    label: "Date Night",
    emoji: "🕯️",
    tagline: "Smooth, sophisticated, unforgettable",
    gradient: "from-rose-500/20 to-pink-500/20",
    drinkSlugs: ["amrut-fusion", "stranger-and-sons", "sula-shiraz", "paul-john-brilliance", "hapusa-gin"],
    cocktailVibes: ["date-night"],
    tags: ["date-night", "romantic-mood"],
  },
  {
    id: "celebrate",
    label: "Celebration",
    emoji: "🥂",
    tagline: "Toast to something worth remembering",
    gradient: "from-amber-500/20 to-yellow-400/20",
    drinkSlugs: ["amrut-fusion", "paul-john-brilliance", "sula-shiraz", "johnnie-walker-black", "grey-goose"],
    cocktailVibes: ["celebrate"],
    tags: ["celebration", "premium-pick"],
  },
  {
    id: "solo",
    label: "Solo Wind-down",
    emoji: "🪑",
    tagline: "Just you, your glass, and your thoughts",
    gradient: "from-purple-500/20 to-violet-500/20",
    drinkSlugs: ["old-monk", "amrut-fusion", "paul-john-brilliance", "sula-shiraz", "hapusa-gin"],
    cocktailVibes: ["solo"],
    tags: ["chill-vibes", "premium-pick"],
  },
  {
    id: "budget",
    label: "Budget Night",
    emoji: "💸",
    tagline: "Maximum fun, minimum spend",
    gradient: "from-green-500/20 to-emerald-500/20",
    drinkSlugs: ["old-monk", "royal-stag", "magic-moments", "kingfisher-strong", "imperial-blue"],
    cocktailVibes: ["budget"],
    tags: ["budget-friendly"],
  },
];

export type BudgetRange = {
  id: string;
  label: string;
  max: number | null;
  min: number;
};

export const BUDGET_RANGES: BudgetRange[] = [
  { id: "tight",  label: "Under ₹300",    min: 0,   max: 300 },
  { id: "mid",    label: "₹300 – ₹800",   min: 300, max: 800 },
  { id: "good",   label: "₹800 – ₹2000",  min: 800, max: 2000 },
  { id: "splurge",label: "Splurge Mode",   min: 2000, max: null },
];
