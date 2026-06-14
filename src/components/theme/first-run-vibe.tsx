"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { THEMES, applyTheme, type ThemeId } from "@/lib/theme";
import { getCookie, setCookie } from "@/lib/client-cookies";
import { AGE_COOKIE } from "@/components/shared/age-gate-overlay";

const VIBE_PROMPT_COOKIE = "sip_vibe_prompt";
const VIBES = THEMES.filter((t) => t.group === "vibe");

/**
 * One-time, on-first-open prompt to set a vibe (which themes the whole app).
 * Shown once the user is past the age gate; dismissed forever via a cookie.
 */
export function FirstRunVibe() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (getCookie(VIBE_PROMPT_COOKIE)) return;
    // Wait briefly so the age gate clears first, then show only if they entered.
    const t = setTimeout(() => {
      if (!getCookie(VIBE_PROMPT_COOKIE) && getCookie(AGE_COOKIE)) setOpen(true);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setCookie(VIBE_PROMPT_COOKIE, "1");
    setOpen(false);
  }

  function pick(id: ThemeId) {
    applyTheme(id, { persist: true });
    dismiss();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-elevated w-full max-w-lg rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-1 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-primary">
                  What's the vibe tonight?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick a mood and we'll dress the whole place in it.
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Maybe later"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  data-theme={v.id}
                  onClick={() => pick(v.id)}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 p-3 text-left transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "var(--background)" }}
                >
                  <span className="flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full" style={{ background: "var(--primary)" }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: "var(--accent)" }} />
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span>{v.emoji}</span>
                    {v.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={dismiss}
              className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Maybe later — keep it cream
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
