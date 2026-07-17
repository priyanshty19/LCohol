"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// Mirrors the ReportReason enum in prisma/schema.prisma.
const REASONS: { value: string; label: string }[] = [
  { value: "SPAM", label: "Spam or scam" },
  { value: "HARASSMENT", label: "Harassment or hate" },
  { value: "UNDERAGE_CONTENT", label: "Underage drinking" },
  { value: "PROMOTES_EXCESSIVE_DRINKING", label: "Promotes excessive drinking" },
  { value: "DRUNK_DRIVING", label: "Drunk driving" },
  { value: "ILLEGAL_ACTIVITY", label: "Illegal activity" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "OTHER", label: "Something else" },
];

type Props = {
  postId?: string;
  commentId?: string;
  className?: string;
};

export function ReportButton({ postId, commentId, className }: Props) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  // Portal to <body> so the fixed overlay can't be trapped by a transformed
  // ancestor (post-card hover/animation), which would confine it to the column.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function reset() {
    setReasons([]);
    setDetails("");
    setState("idle");
  }

  async function submit() {
    if (!reasons.length) return;
    setState("sending");
    try {
      const res = await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, commentId, reasons, details: details.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1400);
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Report this post"
        className={cn(
          "flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-muted-foreground/60 transition-colors hover:text-[var(--ml-sos)]",
          className
        )}
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 sm:rounded-2xl"
            >
              {state === "done" ? (
                <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ml-sober)]/20 text-[var(--ml-sober)]">
                    <Check className="h-6 w-6" />
                  </span>
                  <p className="font-display text-lg font-semibold text-foreground">
                    Thanks for the heads-up
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Our moderators will take a look.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      Report this {commentId ? "comment" : "post"}
                    </h3>
                    <button
                      onClick={() => {
                        setOpen(false);
                        reset();
                      }}
                      aria-label="Close"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5">
                    <p className="pb-1 text-xs text-muted-foreground">
                      Select up to 3 reasons ({reasons.length}/3)
                    </p>
                    {REASONS.map((r) => {
                      const selected = reasons.includes(r.value);
                      const disabled = !selected && reasons.length >= 3;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setReasons((current) =>
                              current.includes(r.value)
                                ? current.filter((value) => value !== r.value)
                                : current.length < 3
                                  ? [...current, r.value]
                                  : current,
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                            selected
                              ? "border-[var(--ml-sos)] bg-[var(--ml-sos)]/10 text-foreground"
                              : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground",
                            disabled && "cursor-not-allowed opacity-45 hover:border-border/60 hover:text-muted-foreground"
                          )}
                        >
                          {r.label}
                          {selected && (
                            <Check className="h-4 w-4 text-[var(--ml-sos)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="shrink-0 border-t border-border/50 px-5 pb-5 pt-3">
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Add any detail (optional)…"
                      rows={2}
                      maxLength={500}
                      className="w-full resize-none rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring"
                    />

                    {state === "error" && (
                      <p className="mt-2 text-xs text-[var(--ml-sos)]">
                        Couldn&apos;t send that — try again in a moment.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={submit}
                      disabled={!reasons.length || state === "sending"}
                      className="btn-velvet mt-3 flex h-10 w-full items-center justify-center rounded-lg font-semibold disabled:opacity-50"
                    >
                      {state === "sending" ? "Sending…" : "Submit report"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
