"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { THEMES, applyTheme, type ThemeId } from "@/lib/theme";
import { getCookie, setCookie } from "@/lib/client-cookies";
import { AGE_COOKIE } from "@/components/shared/age-gate-overlay";

// One ask per calendar day. We store the local date we last prompted on; when
// today's local date differs (i.e. midnight has rolled over in the user's own
// timezone) we ask again. Using the LOCAL date string means the rollover is
// correct per-user with no server cron or UTC math.
const VIBE_DAY_COOKIE = "sip_vibe_day";
const VIBES = THEMES.filter((t) => t.group === "vibe");

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Daily, on-open prompt to set the app's vibe (which themes the whole app).
 * Shown once the user is past the age gate, and re-shown on each new day.
 */
export function DailyVibe() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const today = todayKey();
    if (getCookie(VIBE_DAY_COOKIE) === today) return; // already asked today
    let done = false;
    function attempt() {
      if (done) return;
      // Another tab may have asked in the meantime — respect that.
      if (getCookie(VIBE_DAY_COOKIE) === today) {
        done = true;
        return;
      }
      // Only once they're past the age gate. We POLL (not a single timeout)
      // because a brand-new user accepts the age gate a moment AFTER mount; a
      // one-shot timer would miss day 1 entirely.
      if (getCookie(AGE_COOKIE)) {
        done = true;
        // Stamp at SHOW time, not just on answer: makes "one ask per day" exact
        // and stops a second tab from double-prompting.
        setCookie(VIBE_DAY_COOKIE, today);
        setOpen(true);
      }
    }
    const first = setTimeout(attempt, 900); // let the age gate settle
    const poll = setInterval(attempt, 700);
    const stop = setTimeout(() => {
      done = true;
    }, 15000); // give up after ~15s if they never enter
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearTimeout(stop);
    };
  }, []);

  // Belt-and-braces: the cookie is already stamped at show time, but stamp again
  // on interaction so the "asked today" record holds even on odd open paths.
  function markAsked() {
    setCookie(VIBE_DAY_COOKIE, todayKey());
  }

  function dismiss() {
    markAsked();
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
                  What&apos;s the vibe today?
                </h2>
                <p className="text-sm text-muted-foreground">
                  A fresh day, a fresh mood. Pick one and we&apos;ll dress the
                  whole place in it.
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Maybe later"
                className="-m-1.5 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
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
                    {/* --accent is a near-black surface tone (invisible on the
                        dark tile); --ml-velvet-hover is a visible tint of each
                        vibe's own hue, so the pair previews the vibe's palette. */}
                    <span className="h-4 w-4 rounded-full" style={{ background: "var(--primary)" }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: "var(--ml-velvet-hover)" }} />
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
              Maybe later — keep last night&apos;s look
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
