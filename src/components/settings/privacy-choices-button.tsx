"use client";

import { OPEN_ANALYTICS_CHOICES_EVENT } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function PrivacyChoicesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ANALYTICS_CHOICES_EVENT))}
      className={cn(
        "text-left text-sm text-foreground/90 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      Privacy choices
    </button>
  );
}
