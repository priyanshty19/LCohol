"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { applyTheme, getActiveTheme, isThemeId } from "@/lib/theme";
import type { JamesAction } from "@/lib/james/actions";
import {
  clampJamesPosition,
  JAMES_LAUNCHER_SIZE,
  type JamesPosition,
} from "@/lib/james-position";
import { JamesAvatar } from "./james-avatar";

// The agent route answers with { reply, actions, cards } — `cards` is the drink
// search it ran for the guest. The widget used to drop it on the floor, so a
// "show me gin cocktails" came back as talk with no results.
type Item = {
  kind: "cocktail" | "drink";
  id: string;
  name: string;
  category: string | null;
  subtitle: string | null;
  slug: string | null;
};
type Cards = { results: Item[]; similar: Item[] };
type AgentResponse = {
  reply: string;
  actions: JamesAction[];
  cards?: Cards | null;
  error?: string;
};
// James must always say something the guest can act on — never a blank bubble.
function errorFor(status: number, message?: string): string {
  if (message) return message;
  if (status === 401) return "You'll need to be signed in for me to pour. Sign in and ask me again.";
  if (status === 403) return "This account can't use the bar right now.";
  if (status === 429) return "James needs a breather, give him a minute.";
  if (status === 503) return "James is off duty right now — the bar's AI service isn't available.";
  return `James couldn't get that out (error ${status}). Try me again.`;
}

// James speaks in Markdown. Map each element to the wine theme so his replies
// read as a clean menu card, not a wall of raw `**asterisks**`.
const MD_COMPONENTS = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  strong: ({ ...props }) => (
    <strong className="font-semibold text-[var(--ml-velvet-hover)] not-italic" {...props} />
  ),
  em: ({ ...props }) => <em className="italic" {...props} />,
  ul: ({ ...props }) => (
    <ul className="mb-2 ml-1 list-inside list-disc space-y-0.5 not-italic" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="mb-2 ml-1 list-inside list-decimal space-y-0.5 not-italic" {...props} />
  ),
  li: ({ ...props }) => <li className="leading-snug" {...props} />,
  a: ({ ...props }) => (
    <a className="text-primary underline underline-offset-2" {...props} />
  ),
  code: ({ ...props }) => (
    <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[13px] not-italic" {...props} />
  ),
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  cards?: Cards | null;
  isError?: boolean;
};

// Conversation starters + greeting shift with the active vibe/theme.
const CHIPS_BY_THEME: Record<string, string[]> = {
  light: ["Surprise me", "Something refreshing", "Teach me a drinking game", "I need help"],
  dark: ["Surprise me", "Something for a date night", "Teach me a drinking game", "I need help"],
  party: ["What's a crowd-pleaser?", "A punch for the whole group", "Best party shot", "I need help"],
  chill: ["Something easy tonight", "A slow sipper", "Low-key cocktail", "I need help"],
  "date-night": ["Impress a date", "An elegant pour", "What pairs with dinner?", "I need help"],
  celebrate: ["Pop something special", "A toast-worthy drink", "Bubbly picks", "I need help"],
  solo: ["Just for me tonight", "A quiet nightcap", "Something to savour", "I need help"],
  budget: ["Big flavour, small spend", "Best value bottle", "Cheap and cheerful", "I need help"],
};

const GREETING_BY_THEME: Record<string, string> = {
  light: "Afternoon. James here. What can I pour you?",
  dark: "Evening. James here, your bartender for the night. What are we pouring?",
  party: "There they are! James behind the bar. What's the move tonight?",
  chill: "Hey. James here. Let's keep it easy. What are we sipping?",
  "date-night": "Good evening. James at your service. Something special in mind?",
  celebrate: "We're celebrating? Say no more. James here. What's the occasion?",
  solo: "Just you and the bar tonight. James here. What'll it be?",
  budget: "James here. Great night, small budget? My specialty. What are we after?",
};

const DEFAULT_CHIPS = CHIPS_BY_THEME.light;

function greetingFor(theme: string): Msg {
  return { role: "assistant", content: GREETING_BY_THEME[theme] ?? GREETING_BY_THEME.light };
}

function fitLauncher(position: JamesPosition) {
  return clampJamesPosition(
    position,
    window.innerWidth,
    window.innerHeight,
    JAMES_LAUNCHER_SIZE,
  );
}

export function JamesWidget({ showLauncher = true }: { showLauncher?: boolean }) {
  const router = useRouter();
  const launcherOn = showLauncher;
  const initialGreeting = greetingFor("light");
  const greetingRef = useRef<Msg>(initialGreeting);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => [initialGreeting]);
  const [chips, setChips] = useState<string[]>(DEFAULT_CHIPS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState<JamesPosition | null>(null);
  const [draggingLauncher, setDraggingLauncher] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openedOnce = useRef(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only ever aborted on unmount. Closing the panel, blurring, scrolling or a
  // route change must NOT kill an answer that's already on its way.
  const abortRef = useRef<AbortController | null>(null);
  const suppressLauncherClick = useRef(false);
  const launcherDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: JamesPosition;
    moved: boolean;
  } | null>(null);

  function saveLauncherPosition(position: JamesPosition) {
    const next = fitLauncher(position);
    setLauncherPosition(next);
  }

  useEffect(() => {
    function moveLauncher(event: globalThis.PointerEvent) {
      const drag = launcherDrag.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < 6) return;

      drag.moved = true;
      suppressLauncherClick.current = true;
      setDraggingLauncher(true);
      setLauncherPosition(fitLauncher({ x: drag.origin.x + deltaX, y: drag.origin.y + deltaY }));
    }

    function finishLauncherDrag(event: globalThis.PointerEvent) {
      const drag = launcherDrag.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.moved) {
        const next = fitLauncher({
          x: drag.origin.x + event.clientX - drag.startX,
          y: drag.origin.y + event.clientY - drag.startY,
        });
        setLauncherPosition(next);
      }
      launcherDrag.current = null;
      setDraggingLauncher(false);
    }

    function keepLauncherVisible() {
      setLauncherPosition((current) => {
        if (!current) return null;
        return fitLauncher(current);
      });
    }

    window.addEventListener("resize", keepLauncherVisible);
    window.addEventListener("pointermove", moveLauncher);
    window.addEventListener("pointerup", finishLauncherDrag);
    window.addEventListener("pointercancel", finishLauncherDrag);
    return () => {
      window.removeEventListener("resize", keepLauncherVisible);
      window.removeEventListener("pointermove", moveLauncher);
      window.removeEventListener("pointerup", finishLauncherDrag);
      window.removeEventListener("pointercancel", finishLauncherDrag);
    };
  }, []);

  function startLauncherDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Clear any suppression left over from a previous drag whose click never
    // landed — otherwise the next tap on James silently does nothing.
    suppressLauncherClick.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    launcherDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: rect.left, y: rect.top },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveLauncherWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const offsets: Record<string, JamesPosition> = {
      ArrowLeft: { x: -16, y: 0 },
      ArrowRight: { x: 16, y: 0 },
      ArrowUp: { x: 0, y: -16 },
      ArrowDown: { x: 0, y: 16 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const multiplier = event.shiftKey ? 2 : 1;
    saveLauncherPosition({
      x: rect.left + offset.x * multiplier,
      y: rect.top + offset.y * multiplier,
    });
  }

  // James's "hands" on the floating widget: same agentic actions as the feed
  // composer, so "ask James, James takes you there" works on every screen.
  function runActions(actions: JamesAction[]) {
    for (const a of actions) {
      if (a.type === "set_vibe" && isThemeId(a.theme)) {
        applyTheme(a.theme, { persist: true });
      } else if (a.type === "navigate" && a.path) {
        if (navTimer.current) clearTimeout(navTimer.current);
        navTimer.current = setTimeout(() => router.push(a.path), 800);
      }
    }
  }

  // Track the active vibe/theme: swap James's starters, and his greeting too
  // (only while the conversation hasn't started yet).
  useEffect(() => {
    const sync = () => {
      const t = getActiveTheme();
      setChips(CHIPS_BY_THEME[t] ?? DEFAULT_CHIPS);
      const g = greetingFor(t);
      setMessages((m) => {
        if (m.length === 1 && m[0] === greetingRef.current) {
          greetingRef.current = g;
          return [g];
        }
        return m;
      });
    };
    sync();
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  // Clear a pending navigate timer on unmount (e.g. logout leaves the layout),
  // and only then drop an in-flight ask.
  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
    abortRef.current?.abort();
  }, []);

  // Escape closes the panel; opening moves focus into the composer and closing
  // hands it back to the launcher.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      openedOnce.current = true;
      inputRef.current?.focus();
    } else if (openedOnce.current) {
      launcherRef.current?.focus();
    }
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setBusy(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // Agentic route (same brain as the feed composer): returns a reply + actions
      // (navigate / set_vibe) + cards (the drinks he looked up), so James can both
      // talk and show results from here.
      const res = await fetch("/api/james/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: next
            .filter((m) => m !== greetingRef.current && !m.isError)
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      // A 500 from the route is an HTML error page, not JSON — parsing it must
      // not turn into a silent blank bubble.
      const data = (await res.json().catch(() => ({}))) as Partial<AgentResponse>;
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: errorFor(res.status, data.error), isError: true },
        ]);
        return;
      }
      runActions(data.actions ?? []);
      const cards = data.cards ?? null;
      const hasCards = Boolean(cards && (cards.results.length || cards.similar.length));
      const reply = data.reply?.trim();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            reply || (hasCards ? "Here's what I'd pour. Take a look. 🥃" : "I didn't catch that. Ask me again?"),
          cards,
        },
      ]);
    } catch (err) {
      // Unmount aborted us — the component is gone, nothing to render into.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Lost the line there. One more time?", isError: true },
      ]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  // Let other surfaces (e.g. a bar card) summon James with a prefilled question.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      const p = detail?.prompt;
      if (typeof p === "string" && p) {
        setOpen(true);
        sendRef.current(p);
      } else if (detail?.open) {
        // "Ask James" with no question attached (e.g. the feed card) — just
        // open the bar and let the guest type.
        setOpen(true);
      }
    }
    window.addEventListener("ask-james", handler);
    return () => window.removeEventListener("ask-james", handler);
  }, []);

  return (
    <>
      {launcherOn && (
        <>
          <button
            ref={launcherRef}
            aria-expanded={open}
            aria-controls="james-panel"
            onClick={() => {
              if (suppressLauncherClick.current) {
                suppressLauncherClick.current = false;
                return;
              }
              setOpen((v) => !v);
            }}
            onPointerDown={startLauncherDrag}
            onKeyDown={moveLauncherWithKeyboard}
            aria-label="Ask James, your bartender"
            aria-describedby="james-launcher-hint"
            style={launcherPosition ? { left: launcherPosition.x, top: launcherPosition.y } : undefined}
            className={cn(
              "glow-velvet fixed z-[1200] h-16 w-16 touch-none select-none overflow-hidden rounded-full border border-[var(--ml-velvet-bright)]/50 transition-transform active:scale-95",
              launcherPosition ? "" : "right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-6",
              draggingLauncher ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            {open ? (
              <span className="btn-velvet flex h-full w-full items-center justify-center text-[#fbefe3]">
                <X className="h-6 w-6" />
              </span>
            ) : (
              <JamesAvatar className="h-full w-full" />
            )}
          </button>
          <span id="james-launcher-hint" className="sr-only">
            Drag James to move him. Use the arrow keys to reposition him, or press to open chat.
          </span>
        </>
      )}

      {launcherOn && open && (
        <>
          {/* Full-viewport solid scrim so the panel can NEVER be bled into by
              Leaflet's GPU-composited map. transform-gpu forces scrim + panel onto
              their own composite layers above the map. Tap to close (modal feel). */}
          <button
            type="button"
            aria-label="Close James"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1190] transform-gpu bg-black/60"
          />
          <div
            id="james-panel"
            role="dialog"
            aria-modal="true"
            aria-label="James, the house bartender"
            className="fixed right-4 bottom-40 z-[1200] flex h-[60vh] max-h-[560px] w-[min(92vw,400px)] transform-gpu flex-col overflow-hidden rounded-2xl border border-[var(--ml-brass)]/30 bg-popover shadow-2xl md:bottom-24"
          >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <JamesAvatar className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <div className="font-display text-base font-semibold text-[var(--ml-velvet-hover)]">
                James
              </div>
              <div className="text-[11px] text-muted-foreground">
                the house bartender
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex flex-col",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  role={m.isError ? "alert" : undefined}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : m.isError
                        ? "border border-destructive/40 bg-destructive/10 text-foreground"
                        : "glass-panel-subtle font-display text-[15px] italic text-foreground"
                  )}
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      "…"
                    )
                  ) : (
                    m.content
                  )}
                </div>

                {m.cards && m.cards.results.length > 0 && (
                  <ResultRow title="Top results" items={m.cards.results} />
                )}
                {m.cards && m.cards.similar.length > 0 && (
                  <ResultRow title="Similar to this" items={m.cards.similar} />
                )}
              </motion.div>
            ))}

            {/* James is working — the guest must never stare at nothing. */}
            <div aria-live="polite" className="sr-only">
              {busy ? "James is pouring an answer…" : ""}
            </div>
            {busy && (
              <div className="flex justify-start">
                <div className="glass-panel-subtle flex items-center gap-1 rounded-2xl px-3 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => send(c)}
                  className="pill-inactive rounded-full px-2.5 py-1 text-xs"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask James"
              placeholder="Ask James…"
              className="h-9 flex-1 rounded-full border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring"
            />
            <button
              type="submit"
              disabled={busy}
              aria-label="Send"
              className="btn-velvet flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
        </>
      )}
    </>
  );
}

// The drinks James actually looked up for this answer. Same shape the feed
// composer renders, kept compact for the floating panel.
function ResultRow({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="mt-1.5 w-[85%] space-y-1">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="grid gap-1">
        {items.map((item) => {
          const body = (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 transition hover:border-foreground/30 hover:bg-white/5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{item.name}</div>
                {item.subtitle && (
                  <div className="truncate text-[11px] text-muted-foreground">{item.subtitle}</div>
                )}
              </div>
              {item.category && (
                <span className="shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
                  {item.category}
                </span>
              )}
            </div>
          );
          const key = `${item.kind}-${item.id}`;
          return item.kind === "drink" && item.slug ? (
            <Link key={key} href={`/drinks/${item.slug}`} className="block">
              {body}
            </Link>
          ) : (
            <div key={key}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
