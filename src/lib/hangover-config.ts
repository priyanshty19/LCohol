export type Severity = 1 | 2 | 3 | 4 | 5;

export const SEVERITY_META: Record<
  Severity,
  { emoji: string; label: string; color: string }
> = {
  1: { emoji: "😐", label: "Mild – Just a little foggy", color: "text-green-400" },
  2: { emoji: "😑", label: "Light – Head's a bit heavy", color: "text-yellow-400" },
  3: { emoji: "🥴", label: "Moderate – Hurts to look at the phone", color: "text-orange-400" },
  4: { emoji: "😵", label: "Bad – Why did I do this", color: "text-red-400" },
  5: { emoji: "💀", label: "Brutal – Send help", color: "text-red-600" },
};

export type Remedy = {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  steps: string[];
  forSeverity: Severity[];
};

export const REMEDIES: Remedy[] = [
  {
    id: "hydration",
    title: "Hydration Protocol",
    emoji: "💧",
    subtitle: "Alcohol is a diuretic — you've lost more than you think",
    steps: [
      "Drink a full glass of water right now before you do anything else",
      "Mix 1 ORS sachet (Electral) in 200ml water and sip slowly",
      "Coconut water is your best friend — 400ml over the next hour",
      "Avoid coffee for now — it dehydrates further",
      "Target: 2L water + 1 coconut water before noon",
    ],
    forSeverity: [1, 2, 3, 4, 5],
  },
  {
    id: "nimbu-paani",
    title: "Nimbu Paani Cure",
    emoji: "🍋",
    subtitle: "India's original hangover remedy — it actually works",
    steps: [
      "Squeeze 2 limes into a glass of chilled water",
      "Add ¼ tsp kala namak (black salt) + pinch of regular salt",
      "Add 1 tsp sugar or honey",
      "Optional: tiny pinch of jeera (cumin) powder",
      "Drink slowly. Repeat every 30 min for 2 hours",
    ],
    forSeverity: [1, 2, 3, 4, 5],
  },
  {
    id: "food",
    title: "Recovery Food Plan",
    emoji: "🍳",
    subtitle: "Eat, but eat smart — your stomach is already sensitive",
    steps: [
      "Start with something light: banana, toast, or crackers",
      "Maggi / plain dal-rice restores sodium and carbs without irritating the gut",
      "Avoid spicy or heavy food for the first 2 hours",
      "A banana milkshake is surprisingly effective — potassium + sugar + protein",
      "Aloo paratha with curd (later, when stable) is classic recovery fuel",
    ],
    forSeverity: [1, 2, 3, 4],
  },
  {
    id: "rest",
    title: "Rest Strategy",
    emoji: "😴",
    subtitle: "Sleep is the only thing that actually metabolises alcohol",
    steps: [
      "If you can sleep, sleep — your liver works best while you rest",
      "Set a 2-hour alarm if it's morning — sleeping all day will wreck your night",
      "Keep your phone far enough that the light doesn't hit your face",
      "Dark room, cool temperature, no scrolling",
      "Put a glass of water next to the bed before you sleep",
    ],
    forSeverity: [3, 4, 5],
  },
  {
    id: "adrak-chai",
    title: "Adrak Chai",
    emoji: "🫖",
    subtitle: "Ginger settles nausea better than most medicines",
    steps: [
      "Brew strong chai with 2–3 slices of fresh adrak (ginger)",
      "Add 1 tsp honey instead of sugar",
      "No milk if you're nauseous — have it black",
      "Sip slowly, don't gulp",
      "Tulsi leaves (holy basil) if you have them — bonus anti-nausea effect",
    ],
    forSeverity: [2, 3, 4, 5],
  },
  {
    id: "pain-relief",
    title: "Pain Management",
    emoji: "💊",
    subtitle: "OTC help — but know what to avoid",
    steps: [
      "Paracetamol (Crocin / Dolo 650) is safe for headache — take with food",
      "AVOID ibuprofen (Brufen) — it irritates an already-stressed stomach lining",
      "AVOID aspirin — same issue, plus blood thinning",
      "One tablet max — don't double dose chasing relief",
      "If nausea is severe: Domperidone (Domstal) 10mg is OTC-safe",
    ],
    forSeverity: [3, 4, 5],
  },
  {
    id: "math",
    title: "The Sober Math",
    emoji: "🧮",
    subtitle: "How long until you're actually clear — not just 'feeling okay'",
    steps: [
      "Your liver processes roughly 1 unit of alcohol per hour",
      "1 unit = 1 peg (30ml) of standard spirit, OR 1 standard beer",
      "Feeling okay ≠ blood alcohol is zero — it's often still processing",
      "Eating before drinking slows absorption, NOT elimination",
      "Only time clears alcohol. Coffee, food, showers don't speed it up",
    ],
    forSeverity: [1, 2, 3, 4, 5],
  },
];

export const NEVER_AGAIN_PLEDGES = [
  "Not mixing spirits ever again",
  "No more shots after midnight",
  "Eating before drinking next time",
  "Setting a 3-drink limit and sticking to it",
  "Drinking a glass of water between every drink",
  "No drinking on an empty stomach",
  "Going home at a reasonable hour",
  "Actually knowing when to stop",
];
