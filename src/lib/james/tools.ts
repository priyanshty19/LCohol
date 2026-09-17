import { z } from "zod";
import { NAV_TARGETS, type JamesAction } from "./actions";
import { THEMES, isThemeId, type ThemeId } from "@/lib/theme";

/**
 * James's hands, as real tool definitions.
 *
 * History: actions used to travel as a `%%ACTION%% {...}` line the model was
 * asked to append to its prose, which the server then parsed back out. The
 * model had to reproduce that format exactly every single time, and whenever it
 * didn't the action vanished with no trace. Tool calls are validated by schema
 * instead: they either arrive well-formed or they don't arrive.
 */

const THEME_LABEL = Object.fromEntries(THEMES.map((t) => [t.id, t.label])) as Record<ThemeId, string>;
const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];
const NAV_IDS = Object.keys(NAV_TARGETS) as [string, ...string[]];

export const setVibeSchema = z.object({
  theme: z.enum(THEME_IDS).describe("The vibe/theme id to switch the app to."),
});

export const openPageSchema = z.object({
  page: z.enum(NAV_IDS).describe("The page to open for the guest."),
});

export const findDrinksSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(60)
    .describe("Short search text — a spirit or style, e.g. 'gin' or 'smoky whisky'."),
});

export const JAMES_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "set_vibe",
      description:
        "Change the app's vibe/mood/theme. Use when the guest asks to set the vibe or names an occasion (party, chill, date night, celebration, solo, budget).",
      parameters: z.toJSONSchema(setVibeSchema),
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_page",
      description:
        "Open a section of the app. Use when the guest asks to go somewhere, or a page is the natural next step (e.g. hangover, help).",
      parameters: z.toJSONSchema(openPageSchema),
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_drinks",
      description:
        "Pull up drink or cocktail cards. Use whenever the guest asks to see, show, find, browse or recommend drinks or cocktails, or whenever you name drinks worth showing.",
      parameters: z.toJSONSchema(findDrinksSchema),
    },
  },
];

export type ToolCallLike = { name?: string; args?: unknown };

export type NormalizedToolCalls = {
  actions: JamesAction[];
  /** Search text for drink cards, when James asked for them. */
  cardQuery: string | null;
  /** Tool calls that arrived but failed validation — for logging, not the guest. */
  rejected: string[];
};

/**
 * Turn raw tool calls into the actions the client can run.
 *
 * Unlike the old directive protocol this is not an either/or: "party vibe and
 * show me something" legitimately produces a vibe change AND cards, so each
 * tool call is handled on its own.
 */
export function normalizeToolCalls(calls: ToolCallLike[] | undefined): NormalizedToolCalls {
  const actions: JamesAction[] = [];
  const rejected: string[] = [];
  let cardQuery: string | null = null;
  let vibeSet = false;
  let navSet = false;

  for (const call of calls ?? []) {
    const args = (call?.args ?? {}) as Record<string, unknown>;
    switch (call?.name) {
      case "set_vibe": {
        const parsed = setVibeSchema.safeParse(args);
        // isThemeId keeps this honest if THEMES and the enum ever drift apart.
        if (parsed.success && isThemeId(parsed.data.theme) && !vibeSet) {
          actions.push({
            type: "set_vibe",
            theme: parsed.data.theme,
            label: THEME_LABEL[parsed.data.theme],
          });
          vibeSet = true;
        } else if (!parsed.success) {
          rejected.push(`set_vibe(${JSON.stringify(args)})`);
        }
        break;
      }
      case "open_page": {
        const parsed = openPageSchema.safeParse(args);
        const target = parsed.success ? NAV_TARGETS[parsed.data.page] : undefined;
        // One navigation per reply: two would fight over the router.
        if (target && !navSet) {
          actions.push({ type: "navigate", path: target.path, label: target.label });
          navSet = true;
        } else if (!parsed.success) {
          rejected.push(`open_page(${JSON.stringify(args)})`);
        }
        break;
      }
      case "find_drinks": {
        const parsed = findDrinksSchema.safeParse(args);
        if (parsed.success) {
          if (!cardQuery) cardQuery = parsed.data.query;
        } else {
          rejected.push(`find_drinks(${JSON.stringify(args)})`);
        }
        break;
      }
      default:
        if (call?.name) rejected.push(String(call.name));
    }
  }

  return { actions, cardQuery, rejected };
}

const CARD_ASK =
  /\b(show|see|find|browse|recommend|suggest|pull up|what (should|can) i (drink|order|have|make|mix)|what to drink|what cocktail|i'?ve got|i have)\b/i;
const NEGATION = /\b(don'?t|do not|never|stop|without|no need|rather not)\b/i;

/**
 * Safety net for when James answers well but forgets to call `find_drinks`.
 *
 * Negation is checked PER CLAUSE, not across the whole message: the old
 * whole-message check killed the cards in "I don't want whisky, show me gin",
 * because the "don't" in the first clause suppressed the ask in the second.
 */
export function wantsDrinkCards(message: string): boolean {
  return message
    .split(/[,.;!?]|\band\b|\bbut\b/i)
    .some((clause) => CARD_ASK.test(clause) && !NEGATION.test(clause));
}
