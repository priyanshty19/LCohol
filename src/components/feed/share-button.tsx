"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

type Member = {
  id: string; // connection row id (for React key)
  userId: string; // the member's user id (what we send to)
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export function ShareButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {});
  }, [open]);

  function close() {
    setOpen(false);
    setTimeout(() => {
      setSelected(new Set());
      setDone(null);
    }, 200);
  }

  async function post(payload: object, success: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/posts/${postId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setDone(success);
        setTimeout(close, 1100);
      } else {
        const e = await r.json().catch(() => ({}));
        setDone(e.error ?? "Couldn't share. Try again.");
      }
    } catch {
      setDone("Couldn't share. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 transition-colors hover:text-primary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={close}
                className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
              >
                <motion.div
                  key="sheet"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-popover text-popover-foreground shadow-2xl sm:rounded-2xl"
                >
                  <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
                    <h2 className="font-display text-lg font-semibold">Share</h2>
                    <button onClick={close} aria-label="Close" className="rounded p-1 text-muted-foreground hover:text-foreground">
                      ✕
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <Button
                      variant="gold"
                      className="w-full font-display"
                      disabled={busy}
                      onClick={() => post({ mode: "circle" }, "Shared to your circle 🍻")}
                    >
                      Share to your circle
                    </Button>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Or send to someone
                      </p>
                      {members.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          Your circle is empty. Invite people from your profile.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {members.map((m) => {
                            const name = m.displayName ?? m.username ?? "Member";
                            const on = selected.has(m.userId);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggle(m.userId)}
                                aria-pressed={on}
                                className={
                                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition " +
                                  (on
                                    ? "border-primary bg-primary/10"
                                    : "border-border/50 hover:border-foreground/30 hover:bg-muted/40")
                                }
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                                  {(name[0] ?? "?").toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{name}</span>
                                <span className={"h-4 w-4 rounded-full border " + (on ? "border-primary bg-primary" : "border-border")} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border/50 px-5 py-3">
                    {done && <p className="text-center text-sm text-primary">{done}</p>}
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={busy || selected.size === 0}
                      onClick={() =>
                        post({ mode: "send", toUserIds: [...selected] }, `Sent to ${selected.size} ${selected.size === 1 ? "person" : "people"} 📨`)
                      }
                    >
                      {selected.size > 0 ? `Send to ${selected.size}` : "Send"}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
