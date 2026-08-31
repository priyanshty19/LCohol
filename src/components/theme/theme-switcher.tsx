"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { THEMES, applyTheme, getActiveTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Grid of theme swatches. Persists to the DB so the choice follows the user.
export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeId>("dark");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(getActiveTheme()));
    const sync = () => setActive(getActiveTheme());
    window.addEventListener("themechange", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("themechange", sync);
    };
  }, []);

  function pick(id: ThemeId) {
    applyTheme(id, { persist: true });
    setActive(id);
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => pick(t.id)}
          data-theme={t.id}
          className={cn(
            "group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
            active === t.id
              ? "border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
              : "border-[var(--glass-border)] hover:border-[var(--foreground)]/30"
          )}
          // Paint each card in its own theme's atmosphere as a live preview.
          style={{ background: "var(--background)" }}
        >
          {/* Mini palette preview using that theme's tokens */}
          <span className="flex items-center gap-1">
            <span className="h-4 w-4 rounded-full ring-1 ring-inset ring-[var(--glass-border)]" style={{ background: "var(--primary)" }} />
            <span className="h-4 w-4 rounded-full ring-1 ring-inset ring-[var(--glass-border)]" style={{ background: "var(--accent)" }} />
            <span className="h-4 w-4 rounded-full ring-1 ring-inset ring-[var(--glass-border)]" style={{ background: "var(--card)" }} />
          </span>
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--foreground)" }}
          >
            <span>{t.emoji}</span>
            {t.label}
          </span>
          {active === t.id && (
            <Check className="absolute right-2 top-2 h-4 w-4" style={{ color: "var(--primary)" }} />
          )}
        </button>
      ))}
    </div>
  );
}
