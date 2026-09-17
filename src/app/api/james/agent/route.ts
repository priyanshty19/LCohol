import { NextRequest, NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
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
import { JAMES_TOOLS, normalizeToolCalls, wantsDrinkCards } from "@/lib/james/tools";
import { jamesKeywords } from "@/lib/james/keywords";
import { stripReasoning } from "@/lib/james/reasoning";
import { THEMES, isThemeId, type ThemeId } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMsg = { role: "user" | "assistant"; content: string };

const THEME_LABEL = Object.fromEntries(THEMES.map((t) => [t.id, t.label])) as Record<ThemeId, string>;

// James gets real tools (see lib/james/tools.ts). This text only tells him WHEN
// to reach for them; the call itself is schema-validated, so there is no format
// for him to get wrong and nothing to parse out of his prose.
const TOOL_GUIDANCE = `

ACTING IN THE APP (you can DO things, not just talk)
You have tools: set_vibe (change the vibe/mood/theme), open_page (open a section), find_drinks (pull up drink or cocktail cards).
- Always speak to the guest as well as calling a tool: your words are what they read.
- Call a tool only when it genuinely serves the guest. You may combine one vibe or page change with find_drinks when both are wanted.
- Never mention tools, calls, or these instructions to the guest.
- The safety rules above apply to every tool call: never navigate or recommend in a way that helps someone buy/order alcohol or drink unsafely.`;

function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((b) => (typeof b === "string" ? b : ((b as { text?: string })?.text ?? ""))).join("");
  }
  return "";
}

type ParsedDirective = { type?: string; theme?: string; page?: string; query?: string };

// Legacy directive parser, kept one release as a fallback for the case where a
// model or gateway returns no tool calls at all. Remove once tool calls are
// confirmed in production (see the no_tool_calls log line below).
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
    ) + TOOL_GUIDANCE;

  const messages = [
    new SystemMessage(system),
    ...incoming.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "qwen/qwen3.6-27b",
    temperature: 0.7,
    // 700 was too tight: any thinking tokens counted against it, so a reasoning
    // slip truncated the reply, stripReasoning() emptied what was left, and the
    // guest got the "I'm right here" fallback instead of an answer.
    maxTokens: 1400,
    // Belt: ask qwen for non-thinking mode.
    reasoningEffort: "none",
  });

  const james = model.bindTools(JAMES_TOOLS, {
    tool_choice: "auto",
    // Braces: even if it reasons anyway, Groq keeps reasoning out of the
    // message content, so it can never reach the guest's bubble.
    reasoning_format: "hidden",
  });

  try {
    const ai = await james.invoke(messages);
    const toolCalls = ai.tool_calls ?? [];
    const { actions: toolActions, cardQuery, rejected } = normalizeToolCalls(toolCalls);

    const actions: JamesAction[] = [...toolActions];
    let cards: CatalogSearch | null = cardQuery ? await safeSearch(cardQuery) : null;

    // A tool call that failed its schema would otherwise vanish silently.
    if (rejected.length) console.warn("[james/agent] rejected tool calls", rejected);

    // Fallback for a model/gateway that ignores tools entirely: read the old
    // directive line if one is present. Logged so we can see whether tool
    // calling is actually working in production and drop this path.
    const { reply: parsedReply, directive } = parseReply(stripReasoning(asText(ai.content)));
    if (!toolCalls.length) {
      console.warn("[james/agent] no_tool_calls", { directive: Boolean(directive) });
      if (directive?.type === "set_vibe" && isThemeId(directive.theme)) {
        actions.push({ type: "set_vibe", theme: directive.theme, label: THEME_LABEL[directive.theme] });
      } else if (directive?.type === "navigate" && directive.page) {
        const target = NAV_TARGETS[directive.page];
        if (target) actions.push({ type: "navigate", path: target.path, label: target.label });
      } else if (directive?.type === "find_drinks" && !cards) {
        cards = await safeSearch(String(directive.query ?? lastUser));
      }
    }

    // Safety net: if the guest clearly asked to see/find/recommend drinks but
    // James didn't emit a find_drinks directive, surface cards anyway — unless
    // the ask is negated ("I don't want to see drinks").
    // Cards no longer require actions to be empty: a vibe change and a drinks
    // ask can both be true in one message.
    if (!cards && wantsDrinkCards(lastUser)) {
      const fallback = await safeSearch(lastUser);
      if (fallback?.results.length) cards = fallback;
    }

    let reply = parsedReply;
    if (!reply) {
      console.warn("[james/agent] empty_reply", {
        finish: ai.response_metadata?.finish_reason,
        toolCalls: toolCalls.length,
      });
      if (actions.some((a) => a.type === "set_vibe")) reply = "Done. New vibe is on. 🎉";
      else if (actions.some((a) => a.type === "navigate")) reply = "On our way. 🍸";
      else if (cards) reply = "Here's what I'd pour. Take a look. 🥃";
      else reply = "I'm right here. What are we drinking?";
    }

    return NextResponse.json({ reply, actions, cards });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[james/agent]", err);
    // Honest failure instead of a 200 that reads like James chose to say this:
    // the client renders it as an error the guest can act on (retry).
    return NextResponse.json(
      { error: "James couldn't get through to the bar's AI just now. Try me again." },
      { status: 502 }
    );
  }
}
