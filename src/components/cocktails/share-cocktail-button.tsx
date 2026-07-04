"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Share any cocktail to the feed — mirrors the Mix Lab post-save share, but works
 * from any recipe page (curated or user mix). Creates a RECOMMENDATION post
 * (PUBLIC or CIRCLE) linking back to this recipe. Anonymous / logged-out users
 * get a 401 and see the sign-in nudge.
 */
export function ShareCocktailButton({
  name,
  slug,
  ingredients,
}: {
  name: string;
  slug: string | null;
  ingredients: string[];
}) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState<"PUBLIC" | "CIRCLE" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function share(visibility: "PUBLIC" | "CIRCLE") {
    if (sharing) return;
    setSharing(true);
    setError(null);
    try {
      const list = ingredients.slice(0, 6).join(", ");
      const link = slug ? `\n\nView recipe: /cocktails/${slug}` : "";
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `🍸 You should try "${name}"`,
          body: `${list}${link}`,
          postType: "RECOMMENDATION",
          visibility,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setShared(visibility);
      else if (r.status === 401) setError("Sign in to share.");
      else setError(j.error ?? "Couldn't share.");
    } catch {
      setError("Couldn't share.");
    } finally {
      setSharing(false);
    }
  }

  if (shared) {
    return (
      <p className="text-xs text-[var(--ml-sober)]">
        📣 Shared {shared === "CIRCLE" ? "with your circle" : "with everyone"}.{" "}
        <Link href="/" className="underline underline-offset-2">
          See the feed →
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        📣 Share
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Share with:</span>
        <Button variant="outline" size="sm" disabled={sharing} onClick={() => share("PUBLIC")}>
          🌍 Everyone
        </Button>
        <Button variant="outline" size="sm" disabled={sharing} onClick={() => share("CIRCLE")}>
          🫂 My circle
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
