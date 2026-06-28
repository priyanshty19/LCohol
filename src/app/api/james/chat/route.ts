import { NextRequest, NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { retrieveDrinks } from "@/lib/james/retriever";
import { buildSystemPrompt } from "@/lib/james/persona";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  if (!rateLimit(`james:${user.id}`, 20, 60_000)) {
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
  try {
    if (user.profile?.favoriteDrinkId) {
      const fav = await prisma.drink.findUnique({
        where: { id: user.profile.favoriteDrinkId },
        select: { name: true },
      });
      favoriteDrink = fav?.name ?? null;
    }

    drinks = await retrieveDrinks(lastUser);
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
    },
    drinks
  );

  const lcMessages = [
    new SystemMessage(system),
    ...incoming.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 700,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = await model.stream(lcMessages);
        for await (const chunk of s) {
          const t = typeof chunk.content === "string" ? chunk.content : "";
          if (t) controller.enqueue(encoder.encode(t));
        }
      } catch (err) {
        console.error("[james/chat]", err);
        controller.enqueue(
          encoder.encode("\n\n(James got pulled away for a second — try me again.)")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
