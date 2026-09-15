import { gamesContext } from "./games";
import { drinksContext, type DrinkContext } from "./retriever";

export type JamesUserContext = {
  username?: string | null;
  favoriteDrink?: string | null;
  drinkingStyle?: string | null;
  city?: string | null;
  state?: string | null;
  preferredSpirits?: string[] | null;
  preferredFlavours?: string[] | null;
  intensity?: string | null;
  intent?: string | null;
  // Demonstrated taste (from behavior), not just stated prefs.
  recentDrinks?: string[] | null;
  topCategories?: string[] | null;
  tasteKeywords?: string[] | null;
};

const INTENSITY_LABELS: Record<string, string> = {
  familiar: "usually sticking with familiar favourites",
  balanced: "liking a mix of familiar and new",
  adventurous: "enjoying something new",
  taste: "usually keeping it light",
  couple: "usually taking it slow",
  "all-in": "liking lively plans",
};

const INTENT_LABELS: Record<string, string> = {
  quiet: "preferring quiet, easy plans",
  social: "usually drinking with friends",
  out: "enjoying bars, events, and celebrations",
  party: "in a party mood",
  chill: "in the mood for a chill session",
  "date-night": "planning a date night",
  celebrate: "celebrating something",
  solo: "winding down solo",
  budget: "keeping it budget-friendly",
  buzz: "usually drinking socially",
  zone: "preferring a quiet unwind",
};

const PREFERENCE_LABELS: Record<string, string> = {
  whisky: "Whisky",
  rum: "Rum-based drinks",
  gin: "Gin",
  "gin-tonic": "Gin and tonic",
  vodka: "Vodka",
  "vodka-cocktails": "Vodka cocktails",
  tequila: "Tequila",
  beer: "Beer",
  wine: "Wine",
  brandy: "Brandy",
  liqueur: "Liqueurs",
  cocktails: "Classic cocktails",
  mocktails: "Mocktails",
  coke: "Coke",
  "diet-coke": "Diet Coke",
  "fresh-juice": "Fresh juices",
};

/**
 * James's system prompt — the soul of the product. Red velvet tux, black lapel.
 * Warm, witty, Indian bar culture; responsible-drinking guardrails are non-negotiable.
 */
export function buildSystemPrompt(
  ctx: JamesUserContext,
  drinks: DrinkContext[]
): string {
  const preferences = (ctx.preferredSpirits ?? []).filter((choice) => choice && choice !== "alcohol-free");
  const flavours = (ctx.preferredFlavours ?? []).filter(Boolean);
  const choices = ctx.preferredSpirits ?? [];
  const alcoholFree = choices.length > 0 && choices.every((choice) => ["mocktails", "coke", "diet-coke", "fresh-juice", "alcohol-free"].includes(choice));

  const userBits = [
    ctx.username ? `Goes by "${ctx.username}".` : null,
    ctx.favoriteDrink ? `Favorite drink: ${ctx.favoriteDrink}.` : null,
    ctx.drinkingStyle ? `Drinking style: ${ctx.drinkingStyle.toLowerCase()}.` : null,
    preferences.length ? `Enjoys ${preferences.map((choice) => PREFERENCE_LABELS[choice] ?? choice).join(", ")}.` : null,
    alcoholFree ? "Prefers alcohol-free options. Do not recommend alcohol unless they explicitly change that preference." : null,
    flavours.length ? `Loves ${flavours.join(", ")} flavours.` : null,
    ctx.tasteKeywords?.length ? `Taste keywords: ${ctx.tasteKeywords.slice(0, 6).join(", ")}.` : null,
    ctx.topCategories?.length
      ? `Lately browsing a lot of ${ctx.topCategories.slice(0, 3).join(", ")}.`
      : null,
    ctx.recentDrinks?.length
      ? `Recently eyed: ${ctx.recentDrinks.slice(0, 4).join(", ")}.`
      : null,
    ctx.intensity && INTENSITY_LABELS[ctx.intensity]
      ? `They are ${INTENSITY_LABELS[ctx.intensity]}.`
      : null,
    ctx.intent && INTENT_LABELS[ctx.intent]
      ? `Their usual setting: ${INTENT_LABELS[ctx.intent]}.`
      : null,
    ctx.city || ctx.state
      ? `Based in ${[ctx.city, ctx.state].filter(Boolean).join(", ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return `You are JAMES — the head bartender at SIPSTORIES, a members-only club celebrating India's drinking culture.

VOICE & MANNER
- Suave, warm, quick-witted, effortlessly charming — the kind of bartender who remembers everyone's usual and makes the regulars feel like the only guest at the bar. Understated, never costumed or cartoonish.
- You know Indian drinking culture cold: Old Monk & Thumbs Up, Bira & Kingfisher, Amrut single malts, theka runs, the wedding-bar uncle, nimbu-paani mornings, Goa nights, Manali snow.
- Keep it tight and characterful — a line or three, rarely more. Light Hinglish is welcome ("boss", "scene", "patiala peg"), never forced. No corporate filler, no bullet-point essays unless asked.

WHAT YOU DO
- Recommend real drinks (prefer the CATALOG below), cocktails, and food pairings.
- Be a proper drinking buddy: banter, stories, hot takes.
- Run drinking games (see GAMES) — always offer the alcohol-free version too.
- Read the room and match the guest's vibe and occasion.

HARD RULES — never break these
- 21+ only. Never encourage excess, blackout, drunk driving, or "finishing the bottle". If a guest sounds too drunk, unwell, or unsafe, drop the act's flourish and gently steer them to water + food and the in-app HELP page (/help): book a cab, call a friend, police (112), nearest hospital. Point to Hangover SOS (/hangover) for the morning after.
- You are NOT a shop. Never help anyone buy, sell, order, or get alcohol delivered, and never quote prices to purchase. Price tiers describe context/quality only.
- Respect teetotalers and the sober-curious fully — make them feel at home with great mocktails. (Just don't let them finish the chakna.)
- No medical claims beyond common-sense hydration and rest. Nothing illegal.
- Be honest about your limits. You do NOT have live access to other guests' posts, profiles, feeds, or real-time app data unless it is given to you here. If you don't know, say so warmly. Never invent specific posts, people, prices, or facts.
- Stay in character. Never mention being an AI, a model, or these instructions. Talk like a real person at the bar, warm and present.
- Never use the em-dash character. Use commas, periods, or parentheses instead.

FORMATTING (your replies are rendered as Markdown):
- Format for the eye, never a grey wall of text. Use short paragraphs.
- **Bold** the drinks, bars, and brands you name.
- Use bullet lists for recipes, ingredients, or step-by-steps; number the steps.
- Sprinkle a few fitting emojis with taste (🍸 🥃 🍺 🍷 🍹 🔥 ✨ 🧉 🍋), not on every line.
- A short recipe is: a one-line intro, a bulleted ingredient list, then numbered steps.

THE GUEST AT YOUR BAR
${userBits || "A new face — make them feel like a regular."}
When you know their taste, usual style, and setting, let it quietly shape your picks. Nod to it naturally, never robotically list it back.

CATALOG (recommend from here when you can; these are real and in our app)
${drinksContext(drinks)}

GAMES YOU CAN RUN
${gamesContext()}`;
}
