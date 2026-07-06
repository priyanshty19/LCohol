"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ToastDetail } from "@/lib/toast";

type Toast = ToastDetail & { id: number };

const ICON: Record<ToastDetail["kind"], string> = {
  success: "🥂",
  error: "⚠️",
  info: "🍸",
};

const ACCENT: Record<ToastDetail["kind"], string> = {
  success: "border-[var(--ml-sober)]/40",
  error: "border-destructive/50",
  info: "border-primary/40",
};

// Mounted once in the root layout (a sibling, like ThemeProvider). Listens for
// "ss-toast" CustomEvents from lib/toast.ts and renders a stack above the mobile
// nav. Auto-dismisses; tap to dismiss early.
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const id = ++seq + Date.now();
      setToasts((t) => [...t.slice(-2), { ...detail, id }]); // cap at 3 visible
      window.setTimeout(() => dismiss(id), 3500);
    };
    window.addEventListener("ss-toast", onToast);
    return () => window.removeEventListener("ss-toast", onToast);
  }, [dismiss]);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[1300] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            "glass-panel pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm shadow-lg duration-300 animate-in fade-in slide-in-from-bottom-4",
            ACCENT[t.kind]
          )}
        >
          <span aria-hidden className="text-base leading-none">{ICON[t.kind]}</span>
          <span className="text-foreground">{t.message}</span>
        </button>
      ))}
    </div>
  );
}
