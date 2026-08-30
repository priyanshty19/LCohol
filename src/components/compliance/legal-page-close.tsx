"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function LegalPageClose({ pageName }: { pageName: string }) {
  const router = useRouter();

  function closePage() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/");
  }

  return (
    <button
      type="button"
      onClick={closePage}
      aria-label={`Close ${pageName}`}
      title={`Close ${pageName}`}
      className="not-prose mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/80 text-foreground shadow-sm transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
