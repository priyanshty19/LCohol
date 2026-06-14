/**
 * Hardcoded cocktail recipes using drinks in our DB.
 * Slug values match drinks.slug in the database.
 */

export type CocktailStep = {
  step: number;
  instruction: string;
};

export type CocktailRecipe = {
  id: string;
  name: string;
  tagline: string;
  glass: string;
  garnish: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: string;
  emoji: string;
  vibes: string[];
  ingredients: {
    drinkSlug?: string; // matches our DB slugs
    name: string;       // display name
    amount: string;
    isOptional?: boolean;
  }[];
  steps: CocktailStep[];
};

export const COCKTAIL_RECIPES: CocktailRecipe[] = [
  {
    id: "monk-cola",
    name: "Monk's Cola",
    tagline: "The original desi highball — classic for a reason",
    glass: "Highball",
    garnish: "Lime wedge",
    difficulty: "Easy",
    prepTime: "2 min",
    emoji: "🥤",
    vibes: ["chill", "budget", "party"],
    ingredients: [
      { drinkSlug: "old-monk", name: "Old Monk Rum", amount: "60ml" },
      { name: "Coca-Cola", amount: "150ml" },
      { name: "Ice", amount: "Full glass" },
      { name: "Lime juice", amount: "Squeeze", isOptional: true },
    ],
    steps: [
      { step: 1, instruction: "Fill a highball glass with ice cubes." },
      { step: 2, instruction: "Pour 60ml of Old Monk over the ice." },
      { step: 3, instruction: "Top up with chilled Coca-Cola." },
      { step: 4, instruction: "Squeeze a lime wedge and drop it in. Stir gently." },
    ],
  },
  {
    id: "greater-than-tonic",
    name: "GT&T (Greater Than Tonic)",
    tagline: "India's finest craft gin meets classic tonic",
    glass: "Balloon / Copa",
    garnish: "Cucumber slice + black pepper",
    difficulty: "Easy",
    prepTime: "3 min",
    emoji: "🫒",
    vibes: ["chill", "date-night", "celebrate"],
    ingredients: [
      { drinkSlug: "greater-than-gin", name: "Greater Than Gin", amount: "60ml" },
      { name: "Tonic water", amount: "150ml" },
      { name: "Ice", amount: "Large cube" },
      { name: "Cucumber slices", amount: "2–3 slices" },
      { name: "Fresh black pepper", amount: "2 cracks", isOptional: true },
    ],
    steps: [
      { step: 1, instruction: "Chill a copa or large wine glass in the freezer for 5 minutes." },
      { step: 2, instruction: "Add a large ice cube or sphere." },
      { step: 3, instruction: "Pour 60ml Greater Than Gin over the ice." },
      { step: 4, instruction: "Slowly pour tonic water down the side of the glass." },
      { step: 5, instruction: "Garnish with cucumber slices and 2 cracks of black pepper." },
    ],
  },
  {
    id: "stranger-negroni",
    name: "Bombay Negroni",
    tagline: "Stranger & Sons meets the Italian classic — with an Indian soul",
    glass: "Rocks / Old Fashioned",
    garnish: "Orange twist",
    difficulty: "Medium",
    prepTime: "5 min",
    emoji: "🍊",
    vibes: ["date-night", "celebrate", "solo"],
    ingredients: [
      { drinkSlug: "stranger-and-sons", name: "Stranger & Sons Gin", amount: "30ml" },
      { name: "Campari", amount: "30ml" },
      { name: "Sweet Vermouth", amount: "30ml" },
      { name: "Ice", amount: "Large cube" },
      { name: "Orange peel", amount: "1 strip" },
    ],
    steps: [
      { step: 1, instruction: "Add all spirits to a mixing glass with ice." },
      { step: 2, instruction: "Stir for 30 seconds until well chilled and diluted." },
      { step: 3, instruction: "Strain into a rocks glass over a large ice cube." },
      { step: 4, instruction: "Twist an orange peel over the top to express oils, then drop in." },
    ],
  },
  {
    id: "vodka-masala-soda",
    name: "Desi Vodka Soda",
    tagline: "Magic Moments + chaat masala = India's answer to everything",
    glass: "Highball",
    garnish: "Chaat masala rim + lemon",
    difficulty: "Easy",
    prepTime: "3 min",
    emoji: "🧂",
    vibes: ["party", "budget", "chill"],
    ingredients: [
      { drinkSlug: "magic-moments", name: "Magic Moments Vodka", amount: "60ml" },
      { name: "Club soda", amount: "120ml" },
      { name: "Lime juice", amount: "15ml (half a lime)" },
      { name: "Chaat masala", amount: "Pinch on rim" },
      { name: "Ice", amount: "Full glass" },
    ],
    steps: [
      { step: 1, instruction: "Rub the rim of a highball glass with lime and dip in chaat masala." },
      { step: 2, instruction: "Fill the glass with ice." },
      { step: 3, instruction: "Pour 60ml Magic Moments vodka." },
      { step: 4, instruction: "Squeeze in half a lime, then top with club soda." },
      { step: 5, instruction: "Stir gently and serve immediately." },
    ],
  },
  {
    id: "whisky-sour-desi",
    name: "Indian Whisky Sour",
    tagline: "Blenders Pride shaken up into a sophisticated sour",
    glass: "Coupe / Rocks",
    garnish: "Lemon peel + Angostura dash",
    difficulty: "Medium",
    prepTime: "5 min",
    emoji: "🍋",
    vibes: ["date-night", "celebrate", "solo"],
    ingredients: [
      { drinkSlug: "blenders-pride", name: "Blenders Pride Whisky", amount: "60ml" },
      { name: "Fresh lemon juice", amount: "30ml" },
      { name: "Simple syrup / Sugar syrup", amount: "20ml" },
      { name: "Egg white", amount: "1 (optional, for foam)", isOptional: true },
      { name: "Ice", amount: "Shaker full" },
    ],
    steps: [
      { step: 1, instruction: "If using egg white: dry shake all ingredients (no ice) for 15 seconds to build foam." },
      { step: 2, instruction: "Add ice and shake hard for 10 more seconds." },
      { step: 3, instruction: "Double-strain into a chilled coupe glass." },
      { step: 4, instruction: "Garnish with a lemon peel twist and a dash of Angostura bitters." },
    ],
  },
  {
    id: "dark-stormy",
    name: "Dark & Stormy (Monk Edition)",
    tagline: "Old Monk meets ginger beer — storms in a glass",
    glass: "Highball",
    garnish: "Candied ginger + lime",
    difficulty: "Easy",
    prepTime: "3 min",
    emoji: "⛈️",
    vibes: ["party", "chill", "solo"],
    ingredients: [
      { drinkSlug: "old-monk", name: "Old Monk Rum", amount: "60ml" },
      { name: "Ginger beer", amount: "150ml" },
      { name: "Lime juice", amount: "15ml" },
      { name: "Ice", amount: "Full glass" },
    ],
    steps: [
      { step: 1, instruction: "Fill a highball glass with ice." },
      { step: 2, instruction: "Pour lime juice first, then ginger beer." },
      { step: 3, instruction: "Float Old Monk on top by pouring slowly over a spoon." },
      { step: 4, instruction: "Garnish with a lime wedge. Don't stir — let it blend as you drink." },
    ],
  },
  {
    id: "bira-shandy",
    name: "Bira Shandy",
    tagline: "Bira 91 White meets lemonade — refreshing as a Bengaluru breeze",
    glass: "Pint / Tall",
    garnish: "Lemon slice",
    difficulty: "Easy",
    prepTime: "2 min",
    emoji: "🍺",
    vibes: ["party", "chill", "budget"],
    ingredients: [
      { drinkSlug: "bira-91-white", name: "Bira 91 White", amount: "330ml (1 can)" },
      { name: "Lemonade / 7UP", amount: "100ml" },
      { name: "Ice", amount: "Optional" },
      { name: "Fresh mint", amount: "Sprig", isOptional: true },
    ],
    steps: [
      { step: 1, instruction: "Chill both the beer and lemonade well before mixing." },
      { step: 2, instruction: "Pour lemonade into a tall glass first." },
      { step: 3, instruction: "Tilt the glass and pour Bira 91 White gently to preserve fizz." },
      { step: 4, instruction: "Add a mint sprig for freshness. Serve immediately." },
    ],
  },
  {
    id: "sula-sangria",
    name: "Sula Red Sangria",
    tagline: "Sula Shiraz fruit punch — the crowd-pleaser at every house party",
    glass: "Wine glass / Large pitcher",
    garnish: "Fruit slices floating",
    difficulty: "Easy",
    prepTime: "10 min + 1hr chill",
    emoji: "🍓",
    vibes: ["party", "celebrate", "date-night"],
    ingredients: [
      { drinkSlug: "sula-shiraz", name: "Sula Shiraz", amount: "750ml (1 bottle)" },
      { name: "Orange juice", amount: "200ml" },
      { name: "Apple juice", amount: "100ml" },
      { name: "Brandy / Orange liqueur", amount: "60ml", isOptional: true },
      { name: "Apple + Orange + Lemon (sliced)", amount: "1 each" },
      { name: "Cinnamon stick", amount: "1" },
      { name: "Sugar", amount: "2 tbsp" },
    ],
    steps: [
      { step: 1, instruction: "Combine wine, juices, sugar, and brandy in a large pitcher." },
      { step: 2, instruction: "Add sliced fruits and cinnamon stick." },
      { step: 3, instruction: "Stir until sugar dissolves. Cover and refrigerate for at least 1 hour." },
      { step: 4, instruction: "Serve over ice in wine glasses. Garnish with a slice of the soaked fruit." },
    ],
  },
  {
    id: "amrut-old-fashioned",
    name: "Amrut Old Fashioned",
    tagline: "India's world-class single malt meets the oldest cocktail",
    glass: "Rocks / Double Old Fashioned",
    garnish: "Orange peel + Luxardo cherry",
    difficulty: "Medium",
    prepTime: "5 min",
    emoji: "🥃",
    vibes: ["solo", "date-night", "celebrate"],
    ingredients: [
      { drinkSlug: "amrut-fusion", name: "Amrut Fusion Single Malt", amount: "60ml" },
      { name: "Simple syrup", amount: "10ml (1 barspoon)" },
      { name: "Angostura bitters", amount: "2 dashes" },
      { name: "Large ice cube", amount: "1" },
      { name: "Orange peel", amount: "1 wide strip" },
    ],
    steps: [
      { step: 1, instruction: "Add bitters and simple syrup to a rocks glass." },
      { step: 2, instruction: "Add a large single ice cube." },
      { step: 3, instruction: "Pour Amrut Fusion over the ice." },
      { step: 4, instruction: "Stir gently 10–15 times to chill and dilute." },
      { step: 5, instruction: "Express orange peel oils over the glass by bending the peel, then use as garnish." },
    ],
  },
  {
    id: "moscow-mule-india",
    name: "Mumbai Mule",
    tagline: "Smirnoff + ginger beer + lime — the mule finds its Indian home",
    glass: "Copper mug (or highball)",
    garnish: "Lime wheel + ginger slice",
    difficulty: "Easy",
    prepTime: "3 min",
    emoji: "🫏",
    vibes: ["party", "chill", "date-night"],
    ingredients: [
      { drinkSlug: "smirnoff-21", name: "Smirnoff No. 21 Vodka", amount: "60ml" },
      { name: "Ginger beer", amount: "150ml" },
      { name: "Fresh lime juice", amount: "30ml (1 lime)" },
      { name: "Ice", amount: "Full mug" },
      { name: "Fresh mint", amount: "Sprig", isOptional: true },
    ],
    steps: [
      { step: 1, instruction: "Fill a copper mug (or highball) with crushed ice." },
      { step: 2, instruction: "Pour vodka and lime juice over ice." },
      { step: 3, instruction: "Top with ginger beer and stir gently." },
      { step: 4, instruction: "Garnish with a lime wheel and mint sprig." },
    ],
  },
  {
    id: "paul-john-highball",
    name: "Paul John Highball",
    tagline: "Goan single malt elevated with soda — simple perfection",
    glass: "Highball",
    garnish: "Lemon twist",
    difficulty: "Easy",
    prepTime: "2 min",
    emoji: "🌊",
    vibes: ["chill", "solo", "date-night"],
    ingredients: [
      { drinkSlug: "paul-john-brilliance", name: "Paul John Brilliance", amount: "60ml" },
      { name: "Chilled sparkling water / Club soda", amount: "180ml" },
      { name: "Ice", amount: "Full glass" },
      { name: "Lemon twist", amount: "1 strip" },
    ],
    steps: [
      { step: 1, instruction: "Chill a tall highball glass with ice." },
      { step: 2, instruction: "Pour Paul John Brilliance over the ice." },
      { step: 3, instruction: "Add sparkling water to taste — 1:3 ratio is classic." },
      { step: 4, instruction: "Twist lemon peel to express oils and drop in. Sip slowly." },
    ],
  },
  {
    id: "tequila-sunrise-desi",
    name: "Sunrise Margarita",
    tagline: "Jose Cuervo meets tajin rim — no Cancun trip required",
    glass: "Rocks / Margarita",
    garnish: "Tajin / Chilli salt rim + lime",
    difficulty: "Medium",
    prepTime: "5 min",
    emoji: "🌅",
    vibes: ["party", "celebrate", "date-night"],
    ingredients: [
      { drinkSlug: "jose-cuervo-silver", name: "Jose Cuervo Silver", amount: "60ml" },
      { name: "Triple Sec / Cointreau", amount: "30ml" },
      { name: "Fresh lime juice", amount: "30ml" },
      { name: "Salt + chilli powder (for rim)", amount: "Mixed on plate" },
      { name: "Ice", amount: "Shaker + glass" },
    ],
    steps: [
      { step: 1, instruction: "Mix salt and chilli powder on a small plate. Wet the rim of your glass with lime and dip in the mixture." },
      { step: 2, instruction: "Combine tequila, triple sec, and lime juice in a shaker with ice." },
      { step: 3, instruction: "Shake hard for 15 seconds." },
      { step: 4, instruction: "Strain into your salted glass over fresh ice. Garnish with a lime wheel." },
    ],
  },
  {
    id: "gin-nimbu-pani",
    name: "Gin Nimbu Paani",
    tagline: "Hapusa gin meets India's favourite street drink",
    glass: "Tall / Highball",
    garnish: "Kala namak rim + mint",
    difficulty: "Easy",
    prepTime: "5 min",
    emoji: "🍋‍🟩",
    vibes: ["chill", "budget", "party"],
    ingredients: [
      { drinkSlug: "hapusa-gin", name: "Hapusa Gin", amount: "45ml" },
      { name: "Fresh lime juice", amount: "30ml (2 limes)" },
      { name: "Sugar syrup", amount: "15ml" },
      { name: "Chilled water or soda", amount: "100ml" },
      { name: "Kala namak (black salt)", amount: "Pinch" },
      { name: "Fresh mint leaves", amount: "6–8 leaves" },
      { name: "Ice", amount: "Full glass" },
    ],
    steps: [
      { step: 1, instruction: "Muddle mint leaves lightly in the bottom of a glass." },
      { step: 2, instruction: "Add lime juice, sugar syrup, and a pinch of kala namak. Stir." },
      { step: 3, instruction: "Fill with ice, pour Hapusa gin over it." },
      { step: 4, instruction: "Top with soda. Stir once. Taste and adjust lime/sugar." },
    ],
  },
  {
    id: "rum-cold-coffee",
    name: "Monk's Cold Coffee",
    tagline: "Old Monk + cold coffee — the late-night fuel nobody talks about",
    glass: "Tall / Mason jar",
    garnish: "Coffee powder dusting",
    difficulty: "Easy",
    prepTime: "5 min",
    emoji: "☕",
    vibes: ["solo", "chill", "party"],
    ingredients: [
      { drinkSlug: "old-monk", name: "Old Monk Rum", amount: "45ml" },
      { name: "Cold brew coffee / strong instant coffee (cold)", amount: "150ml" },
      { name: "Milk or condensed milk", amount: "60ml" },
      { name: "Sugar / simple syrup", amount: "To taste" },
      { name: "Ice", amount: "Full glass" },
    ],
    steps: [
      { step: 1, instruction: "Brew strong coffee and cool it down completely." },
      { step: 2, instruction: "Blend or shake coffee, milk, sugar, and Old Monk with ice." },
      { step: 3, instruction: "Pour into a tall glass over fresh ice." },
      { step: 4, instruction: "Dust with coffee powder or cocoa. Serve immediately." },
    ],
  },
  {
    id: "wine-peach-spritz",
    name: "Sula Peach Spritz",
    tagline: "Sula Sauvignon Blanc + peach nectar — garden party in a glass",
    glass: "Wine glass / Flute",
    garnish: "Peach slice + mint",
    difficulty: "Easy",
    prepTime: "3 min",
    emoji: "🍑",
    vibes: ["celebrate", "date-night", "chill"],
    ingredients: [
      { drinkSlug: "sula-sauvignon-blanc", name: "Sula Sauvignon Blanc", amount: "120ml" },
      { name: "Peach nectar / juice", amount: "60ml" },
      { name: "Sparkling water", amount: "60ml" },
      { name: "Ice", amount: "Optional" },
      { name: "Fresh mint", amount: "Sprig", isOptional: true },
    ],
    steps: [
      { step: 1, instruction: "Chill the wine and peach nectar before mixing." },
      { step: 2, instruction: "Pour peach nectar into a wine glass." },
      { step: 3, instruction: "Add chilled Sula Sauvignon Blanc." },
      { step: 4, instruction: "Top with a splash of sparkling water. Stir gently." },
      { step: 5, instruction: "Garnish with a peach slice and mint. Serve immediately." },
    ],
  },
];

/** Get all unique drink slugs needed across all recipes */
export function getAllRequiredSlugs(): string[] {
  const slugs = new Set<string>();
  COCKTAIL_RECIPES.forEach((r) =>
    r.ingredients.forEach((i) => { if (i.drinkSlug) slugs.add(i.drinkSlug); })
  );
  return Array.from(slugs);
}

/** Find recipes that can be made with a given set of drink slugs */
export function findMatchingRecipes(
  availableSlugs: string[],
  requireAll = false
): { recipe: CocktailRecipe; matched: number; total: number }[] {
  const available = new Set(availableSlugs);

  return COCKTAIL_RECIPES.map((recipe) => {
    const required = recipe.ingredients.filter(
      (i) => i.drinkSlug && !i.isOptional
    );
    const matched = required.filter((i) => i.drinkSlug && available.has(i.drinkSlug)).length;
    return { recipe, matched, total: required.length };
  })
    .filter(({ matched, total }) =>
      requireAll ? matched === total : matched > 0
    )
    .sort((a, b) => b.matched / b.total - a.matched / a.total);
}

/** Filter recipes by vibe */
export function getRecipesByVibe(vibe: string): CocktailRecipe[] {
  return COCKTAIL_RECIPES.filter((r) => r.vibes.includes(vibe));
}
