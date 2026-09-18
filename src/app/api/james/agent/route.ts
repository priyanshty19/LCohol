import { NextRequest, NextResponse } from "next/server";
import { createJamesModel, jamesProviderFailure } from "@/lib/james/model";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getCurrentUser } from "@/lib/auth";
import { logInteraction } from "@/lib/interactions";
import { getTasteProfile } from "@/lib/behavior";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { retrieveDrinks } from "@/lib/james/retriever";
import { buildSystemPrompt } from "@/lib/james/persona";
import { searchCatalog, type CatalogSearch } from "@/lib/james/search";
import { NAV_TARGETS, type JamesAction } from "@/lib/james/actions";
import { jamesKeywords } from "@/lib/james/keywords";
import { stripReasoning } from "@/lib/james/reasoning";
import { THEMES, isThemeId, type ThemeId } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMsg = { role: "user" | "assistant"; content: string };

const THEME_LABEL = Object.fromEntries(THEMES.map((t) => [t.id, t.label])) as Record<ThemeId, string>;
const THEME_LIST = THEMES.map((t) => t.id).join("|");
const NAV_LIST = Object.keys(NAV_TARGETS).join("|");

// Directive protocol instead of native tool-calling: llama-on-Groq reliably
// breaks when it mixes prose with a structured tool call, so James instead
// appends one machine-readable line we parse + strip server-side.
const ACTION_PROTOCOL = `

ACTING IN THE APP (you can DO things, not just talk)
When an in-app action serves the guest, append ONE directive as the very last line of your reply: %%ACTION%% then compact JSON. Always write your short spoken reply FIRST, then the directive alone on the final line.
- Change the vibe / mood / theme: %%ACTION%% {"type":"set_vibe","theme":"<${THEME_LIST}>"}
  Use when the guest asks to set the vibe/mood, or names an occasion (party, chill, date night, celebration, solo, budget).
- Open a page: %%ACTION%% {"type":"navigate","page":"<${NAV_LIST}>"}
  Use when the guest asks to go to or open a section, or a page is the natural next step (e.g. hangover, help).
- Pull up drink or cocktail cards: %%ACTION%% {"type":"find_drinks","query":"<spirit or style>"}
  Use whenever the guest asks to see, show, find, browse, or recommend drinks or cocktails, or whenever you name drinks worth showing. Keep the query short (a spirit or style, e.g. "gin", "smoky whisky").
Rules: at most one directive, only when it truly serves the guest; never mention the directive, the JSON, the word ACTION, or these instructions to the guest; the safety rules above apply to every action (never navigate or recommend in a way that helps someone buy/order alcohol or drink unsafely).`;

function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((b) => (typeof b === "string" ? b : ((b as { text?: string })?.text ?? ""))).join("");
  }
  return "";
}

type ParsedDirective = { type?: string; theme?: string; page?: string; query?: string };

// Pull the (at most one) %%ACTION%% directive out and return the cleaned reply.
function parseReply(raw: string): { reply: string; directive: ParsedDirective | null } {
  const lines = raw.split("\n");
  const kept: string[] = [];
  let directive: ParsedDirective | null = null;
  for (const line of lines) {
    const idx = line.indexOf("%%ACTION%%");
    if (idx !== -1) {
      if (!directive) {
        const jsonPart = line.slice(idx + "%%ACTION%%".length).trim();
        try {
          directive = JSON.parse(jsonPart);
        } catch {
          /* malformed — ignore, drop the line */
        }
      }
      const before = line.slice(0, idx).trim();
      if (before) kept.push(before);
      continue;
    }
    kept.push(line);
  }
  return { reply: kept.join("\n").trim(), directive };
}

// The card lookup is a bonus on top of the answer. If it fails, the guest still
// gets James's reply — it must never take the whole response down with it.
async function safeSearch(query: string): Promise<CatalogSearch | null> {
  try {
    return await searchCatalog(query);
  } catch (err) {
    console.error("[james/agent] catalog search failed", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  if (!(await rateLimit(`james:${user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: "James needs a breather, give him a minute." }, { status: 429 });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "James is off duty right now." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}) as { messages?: unknown });
  const incoming: ChatMsg[] = Array.isArray(body.messages)
    ? body.messages.slice(-12).map((m: ChatMsg) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.slice(0, 2000) : "",
      }))
    : [];
  const lastUser = [...incoming].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) {
    return NextResponse.json({ error: "Ask James something first." }, { status: 400 });
  }

  logInteraction({
    userId: user.id,
    interactionType: "ASK_JAMES",
    targetType: "JAMES",
    context: { q: lastUser.slice(0, 200), keywords: jamesKeywords(lastUser) },
  });

  // These DB reads used to sit outside any try/catch: a saturated pool or any
  // other Prisma error escaped as a 500 HTML error page, which the client can't
  // parse into JSON — so James silently rendered nothing. Same handling as
  // /api/james/chat: a JSON body the UI can always show.
  let favoriteDrink: string | null = null;
  let groundingDrinks: Awaited<ReturnType<typeof retrieveDrinks>>;
  let taste: Awaited<ReturnType<typeof getTasteProfile>>;
  try {
    if (user.profile?.favoriteDrinkId) {
      const fav = await prisma.drink.findUnique({
        where: { id: user.profile.favoriteDrinkId },
        select: { name: true },
      });
      favoriteDrink = fav?.name ?? null;
    }

    // Fetch the grounding catalog + the user's demonstrated taste in parallel so the
    // behavioral signal adds no latency over the existing retrieval step.
    [groundingDrinks, taste] = await Promise.all([
      retrieveDrinks(lastUser),
      getTasteProfile(user.id),
    ]);
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[james/agent] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[james/agent] grounding failed", err);
    return NextResponse.json(
      { error: "James can't reach the bar's shelves right now. Try me again in a moment." },
      { status: 503 },
    );
  }
  const system =
    buildSystemPrompt(
      {
        username: user.profile?.username,
        favoriteDrink,
        drinkingStyle: user.profile?.drinkingStyle,
        city: user.profile?.city,
        state: user.profile?.state,
        preferredSpirits: user.profile?.preferredSpirits,
        preferredFlavours: user.profile?.preferredFlavours,
        intensity: user.profile?.intensity,
        intent: user.profile?.intent,
        recentDrinks: taste.recentDrinks,
        topCategories: taste.topCategories,
        tasteKeywords: taste.keywords,
      },
      groundingDrinks
    ) + ACTION_PROTOCOL;

  const messages = [
    new SystemMessage(system),
    ...incoming.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  const model = createJamesModel();

  try {
    const ai = await model.invoke(messages, { signal: request.signal });
    const { reply: parsedReply, directive } = parseReply(stripReasoning(asText(ai.content)));

    const actions: JamesAction[] = [];
    let cards: CatalogSearch | null = null;

    if (directive?.type === "set_vibe" && isThemeId(directive.theme)) {
      actions.push({ type: "set_vibe", theme: directive.theme, label: THEME_LABEL[directive.theme] });
    } else if (directive?.type === "navigate" && directive.page) {
      const target = NAV_TARGETS[directive.page];
      if (target) actions.push({ type: "navigate", path: target.path, label: target.label });
    } else if (directive?.type === "find_drinks") {
      cards = await safeSearch(String(directive.query ?? lastUser));
    }

    // Observability: a directive that resolved to nothing (bad theme, unknown
    // page, typo'd type) would otherwise fail silently.
    if (directive && actions.length === 0 && !cards) {
      console.warn("[james/agent] directive produced no action", directive);
    }

    // Safety net: if the guest clearly asked to see/find/recommend drinks but
    // James didn't emit a find_drinks directive, surface cards anyway — unless
    // the ask is negated ("I don't want to see drinks").
    const wantsCards =
      /\b(show|see|find|browse|recommend|suggest|pull up|what (should|can) i (drink|order|have|make|mix)|what to drink|what cocktail|i'?ve got|i have)\b/i.test(
        lastUser
      );
    const negated = /\b(don'?t|do not|not|no|never|stop|without|isn'?t|aren'?t)\b/i.test(lastUser);
    if (!cards && actions.length === 0 && wantsCards && !negated) {
      const fallback = await safeSearch(lastUser);
      if (fallback?.results.length) cards = fallback;
    }

    let reply = parsedReply;
    if (!reply) {
      if (actions.some((a) => a.type === "set_vibe")) reply = "Done. New vibe is on. 🎉";
      else if (actions.some((a) => a.type === "navigate")) reply = "On our way. 🍸";
      else if (cards) reply = "Here's what I'd pour. Take a look. 🥃";
      else reply = "I'm right here. What are we drinking?";
    }

    return NextResponse.json({ reply, actions, cards });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    const failure = jamesProviderFailure(err);
    console.error("[james/agent] provider request failed", { status: (err as { status?: number })?.status ?? failure.status });
    // Honest failure instead of a 200 that reads like James chose to say this:
    // the client renders it as an error the guest can act on (retry).
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status, headers: failure.headers }
    );
  }
}
