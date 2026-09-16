"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send } from "lucide-react";
import { JamesAvatar } from "@/components/james/james-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chevron } from "@/components/ui/chevron";
import { CategoryIcon } from "@/components/drinks/category-icons";
import { applyTheme, isThemeId } from "@/lib/theme";
import type { JamesAction } from "@/lib/james/actions";

type Item = {
  kind: "cocktail" | "drink";
  id: string;
  name: string;
  category: string | null;
  subtitle: string | null;
  slug: string | null;
};
type Cards = { results: Item[]; similar: Item[] };
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: Cards | null;
  actions?: JamesAction[];
  isError?: boolean;
};
type AgentResponse = { reply: string; actions: JamesAction[]; cards: Cards | null; error?: string };

const STORAGE_KEY = "askjames:chat";
const SUGGESTIONS = [
  "What should I drink tonight?",
  "Set the vibe to party",
  "Show me some gin cocktails",
  "Take me to Hangover SOS",
];

const MD = {
  p: (p: object) => <p className="mb-1.5 last:mb-0" {...p} />,
  strong: (p: object) => <strong className="font-semibold text-foreground" {...p} />,
  ul: (p: object) => <ul className="my-1 ml-4 list-disc space-y-0.5" {...p} />,
  ol: (p: object) => <ol className="my-1 ml-4 list-decimal space-y-0.5" {...p} />,
  li: (p: object) => <li {...p} />,
  a: (p: object) => <a className="text-primary underline underline-offset-2" {...p} />,
};

// A refusal from the route (no session, no API key, rate limited) must reach the
// guest in words they can act on, not as a generic "he stepped away".
function errorFor(status: number, message?: string): string {
  if (message) return message;
  if (status === 401) return "You'll need to be signed in for James to pour. Sign in and ask again.";
  if (status === 403) return "This account can't use the bar right now.";
  if (status === 429) return "James needs a breather, give him a minute.";
  if (status === 503) return "James is off duty right now — the bar's AI service isn't available.";
  return `James couldn't get that out (error ${status}). Give it another go.`;
}

// crypto.randomUUID is missing on older mobile browsers (Safari < 15.4, older
// Android) — common in our audience — so fall back to a cheap random id.
function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function AskJames() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timers if the component unmounts first.
  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  // Restore the session's conversation (sessionStorage clears on tab close).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { messages?: Msg[]; collapsed?: boolean };
          if (Array.isArray(saved.messages)) setMessages(saved.messages);
          setCollapsed(Boolean(saved.collapsed));
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: messages.slice(-20), collapsed })
      );
    } catch {
      /* ignore */
    }
  }, [messages, collapsed, hydrated]);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Auto-collapse the expanded panel once the user scrolls into the feed, so the
  // James composer shrinks to just its hero bar (the "main module"). rAF-throttled
  // + passive so it never janks the scroll.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 72);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  function runActions(actions: JamesAction[]) {
    for (const a of actions) {
      if (a.type === "set_vibe" && isThemeId(a.theme)) {
        applyTheme(a.theme, { persist: true });
      } else if (a.type === "navigate" && a.path) {
        // Let the guest read James's confirmation before we leave the feed.
        if (navTimer.current) clearTimeout(navTimer.current);
        navTimer.current = setTimeout(() => router.push(a.path), 800);
      }
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setCollapsed(false);
    // Bring the panel back into view if the user had scrolled it away.
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const userMsg: Msg = { id: uid(), role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setSending(true);
    try {
      const r = await fetch("/api/james/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      // A 500 answers with an HTML error page, so json() can throw — parse
      // defensively and still say something honest.
      const data = (await r.json().catch(() => ({}))) as Partial<AgentResponse>;
      if (!r.ok) {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: errorFor(r.status, data.error),
            isError: true,
          },
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
          id: uid(),
          role: "assistant",
          content:
            reply || (hasCards ? "Here's what I'd pour. Take a look. 🥃" : "I didn't catch that. Ask me again?"),
          cards,
          actions: data.actions,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: "James stepped away from the bar. Give it another go.",
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
  }

  const hasChat = messages.length > 0;
  // The expanded greeting/chat shows only near the top; scrolling collapses it to
  // the hero bar. The manual chevron still works independently. An incidental
  // scroll must NOT pull the panel away while James is mid-answer, or the guest
  // asks a question and watches the reply vanish before it lands.
  const showExtra = !collapsed && (!scrolled || sending);

  // No background band on the wrapper — it rendered as a faint rectangle around
  // the curved pill. The pill itself is opaque, so it masks scrolled content.
  return (
    <div className="sticky top-14 z-40 space-y-3 py-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="glow-velvet flex items-center gap-2 rounded-full border border-[var(--ml-velvet-bright)]/30 bg-card p-2 pl-2.5 shadow-sm transition focus-within:border-[var(--ml-velvet-bright)]/60 sm:gap-3"
      >
        {/* James is the app's hero character — a rounded, velvet-ringed avatar. */}
        <JamesAvatar className="h-11 w-11 shrink-0 rounded-full ring-2 ring-[var(--ml-velvet-bright)]/40" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            // Delay so tapping a suggestion chip registers before the hints close.
            blurTimer.current = setTimeout(() => setFocused(false), 150);
          }}
          placeholder="Ask James anything, or tell him to set the vibe…"
          aria-label="Ask James"
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        {hasChat && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand James's chat" : "Collapse James's chat"}
            aria-expanded={!collapsed}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
          >
            <Chevron className={collapsed ? "" : "rotate-180"} />
          </button>
        )}
        <Button
          type="submit"
          variant="gold"
          size="icon"
          disabled={sending || input.trim().length < 1}
          aria-label="Send to James"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <AnimatePresence initial={false}>
        {showExtra && (hasChat || sending) && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">James, your bartender</span>
              {hasChat && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div ref={scrollRef} className="max-h-[55vh] space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}
              <div aria-live="polite" className="sr-only">
                {sending ? "James is pouring an answer…" : ""}
              </div>
              {sending && <TypingRow />}
            </div>
          </motion.div>
        )}

        {/* Hints (greeting + example asks) appear only when the user taps the
            James bar — not by default — so the feed stays clean until intent. */}
        {focused && !hasChat && !sending && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border/60 bg-card/70 p-4"
          >
            <div className="flex items-start gap-2.5">
              <JamesAvatar className="h-8 w-8 shrink-0" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Evening. I&apos;m James, your bartender. Ask me for a pour, a vibe, or where to go.
                I can set the mood and walk you there myself.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {(collapsed || scrolled) && hasChat && (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => {
              setCollapsed(false);
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <span className="truncate">Chat with James ({messages.length})</span>
            <Chevron />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
      <JamesAvatar className="h-7 w-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div
          role={msg.isError ? "alert" : undefined}
          className={
            msg.isError
              ? "rounded-2xl rounded-tl-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-foreground"
              : "rounded-2xl rounded-tl-sm bg-muted/40 px-3 py-2 text-sm leading-relaxed text-foreground"
          }
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
            {msg.content}
          </ReactMarkdown>
        </div>

        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.actions.map((a, i) => (
              <Badge key={i} variant="outline" className="gap-1 text-[10px]">
                {a.type === "set_vibe" ? `🎨 Vibe: ${a.label}` : `→ ${a.label}`}
              </Badge>
            ))}
          </div>
        )}

        {msg.cards && msg.cards.results.length > 0 && (
          <ResultRow title="Top results" items={msg.cards.results} />
        )}
        {msg.cards && msg.cards.similar.length > 0 && (
          <ResultRow title="Similar to this" items={msg.cards.similar} />
        )}
      </div>
    </motion.div>
  );
}

function TypingRow() {
  return (
    <div className="flex gap-2.5">
      <JamesAvatar className="h-7 w-7 shrink-0" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted/40 px-3 py-2.5">
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
  );
}

function ResultRow({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <ResultCard key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ item }: { item: Item }) {
  const body = (
    <div className="flex h-full items-start gap-2.5 rounded-lg border border-border/60 bg-background/40 p-2.5 transition hover:border-foreground/30 hover:bg-muted/40">
      <CategoryIcon
        category={item.category ?? item.kind}
        className="mt-0.5 h-6 w-6 shrink-0 text-primary/55"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.name}</div>
        {item.subtitle && (
          <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
        )}
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
        {item.category ?? item.kind}
      </Badge>
    </div>
  );

  if (item.kind === "drink" && item.slug) {
    return (
      <Link href={`/drinks/${item.slug}`} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
