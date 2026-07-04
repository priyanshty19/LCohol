"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { applyTheme, getActiveTheme, isThemeId } from "@/lib/theme";
import type { JamesAction } from "@/lib/james/actions";
import { JamesAvatar } from "./james-avatar";

type AgentResponse = { reply: string; actions: JamesAction[]; error?: string };

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

type Msg = { role: "user" | "assistant"; content: string };

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

export function JamesWidget({ showLauncher = true }: { showLauncher?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  // Screens that already surface James inline (feed's AskJames composer, and the
  // Cocktails ingredient search) don't need the floating bottom-right launcher —
  // it would double up. Hide it there.
  const INLINE_JAMES_ROUTES = new Set(["/", "/cocktails"]);
  const launcherOn = showLauncher && !INLINE_JAMES_ROUTES.has(pathname);
  const greetingRef = useRef<Msg>(greetingFor("light"));
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => [greetingRef.current]);
  const [chips, setChips] = useState<string[]>(DEFAULT_CHIPS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clear a pending navigate timer on unmount (e.g. logout leaves the layout).
  useEffect(() => () => { if (navTimer.current) clearTimeout(navTimer.current); }, []);

  // On the feed, James already lives at the top (the AskJames composer), so the
  // floating panel must not linger here if it was opened on another route.
  useEffect(() => {
    if (pathname === "/") setOpen(false);
  }, [pathname]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setBusy(true);
    try {
      // Agentic route (same brain as the feed composer): returns a reply + actions
      // (navigate / set_vibe), so James can walk the user to any module from here.
      const res = await fetch("/api/james/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m !== greetingRef.current)
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as AgentResponse;
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error ?? "James stepped away. Try again in a moment." },
        ]);
        return;
      }
      runActions(data.actions ?? []);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Lost the line there. One more time?" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // Let other surfaces (e.g. a bar card) summon James with a prefilled question.
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    function handler(e: Event) {
      const p = (e as CustomEvent).detail?.prompt;
      if (typeof p === "string" && p) {
        setOpen(true);
        sendRef.current(p);
      }
    }
    window.addEventListener("ask-james", handler);
    return () => window.removeEventListener("ask-james", handler);
  }, []);

  return (
    <>
      {launcherOn && (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Ask James, your bartender"
          className="glow-velvet fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[1200] h-14 w-14 overflow-hidden rounded-full border border-[var(--ml-velvet-bright)]/50 transition-transform active:scale-95 md:bottom-6"
        >
          {open ? (
            <span className="btn-velvet flex h-full w-full items-center justify-center text-[#fbefe3]">
              <X className="h-6 w-6" />
            </span>
          ) : (
            <JamesAvatar className="h-full w-full" />
          )}
        </button>
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
          <div className="fixed right-4 bottom-40 z-[1200] flex h-[60vh] max-h-[560px] w-[min(92vw,400px)] transform-gpu flex-col overflow-hidden rounded-2xl border border-[var(--ml-brass)]/30 bg-popover shadow-2xl md:bottom-24">
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
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
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
              </motion.div>
            ))}
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
