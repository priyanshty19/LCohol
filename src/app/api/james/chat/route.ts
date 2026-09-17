import { NextRequest, NextResponse } from "next/server";
import { createJamesModel, jamesProviderFailure } from "@/lib/james/model";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { retrieveDrinks } from "@/lib/james/retriever";
import { buildSystemPrompt } from "@/lib/james/persona";
import { getTasteProfile } from "@/lib/behavior";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMsg = { role: "user" | "assistant"; content: string };

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

  const body = await request.json();
  const incoming: ChatMsg[] = Array.isArray(body.messages)
    ? body.messages.slice(-12).map((m: ChatMsg) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.slice(0, 2000) : "",
      }))
    : [];
  const lastUser = [...incoming].reverse().find((m) => m.role === "user")?.content ?? "";

  let favoriteDrink: string | null = null;
  let drinks: Awaited<ReturnType<typeof retrieveDrinks>>;
  let taste: Awaited<ReturnType<typeof getTasteProfile>>;
  try {
    if (user.profile?.favoriteDrinkId) {
      const fav = await prisma.drink.findUnique({
        where: { id: user.profile.favoriteDrinkId },
        select: { name: true },
      });
      favoriteDrink = fav?.name ?? null;
    }

    [drinks, taste] = await Promise.all([retrieveDrinks(lastUser), getTasteProfile(user.id)]);
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/james/chat] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    throw err;
  }
  const system = buildSystemPrompt(
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
    drinks
  );

  const lcMessages = [
    new SystemMessage(system),
    ...incoming.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  const model = createJamesModel();

  // Confirm the provider accepted the request before committing a 200 stream.
  let source: Awaited<ReturnType<typeof model.stream>>;
  let first: Awaited<ReturnType<typeof source.next>>;
  try {
    source = await model.stream(lcMessages, { signal: request.signal });
    first = await source.next();
  } catch (err) {
    const failure = jamesProviderFailure(err);
    console.error("[james/chat] provider request failed", { status: (err as { status?: number })?.status ?? failure.status });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status, headers: failure.headers },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!first.done && typeof first.value.content === "string") {
          controller.enqueue(encoder.encode(first.value.content));
        }
        for await (const chunk of source) {
          const t = typeof chunk.content === "string" ? chunk.content : "";
          if (t) controller.enqueue(encoder.encode(t));
        }
      } catch (err) {
        console.error("[james/chat] response stream interrupted");
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
