"use client";

import { useState } from "react";
import { GlassWater } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CheerButton({
  cocktailId,
  initialCount,
  initialCheered,
  canCheer,
}: {
  cocktailId: string;
  initialCount: number;
  initialCheered: boolean;
  canCheer: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [cheered, setCheered] = useState(initialCheered);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!canCheer || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/cocktails/${cocktailId}/cheer`, { method: "POST" });
      const payload = (await response.json()) as {
        data?: { cheered: boolean; count: number };
        error?: string;
      };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Couldn't record your cheer.");
      setCheered(payload.data.cheered);
      setCount(payload.data.count);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't record your cheer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant={cheered ? "gold" : "outline"}
        onClick={toggle}
        disabled={!canCheer || pending}
        aria-pressed={cheered}
        title={canCheer ? "Cheer this mix" : "Your mix"}
      >
        <GlassWater className={cheered ? "fill-current" : ""} />
        {cheered ? "Cheered" : "Cheers"} · {count}
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
