"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/track";
import type { InteractionType, TargetType } from "@/generated/prisma/client";

// Drop-in view tracker. Renders nothing; fires one fire-and-forget beacon on mount.
// Safe to place in a server component (it's a client island). e.g.
//   <TrackView targetType="DRINK" targetId={drink.id} />
export function TrackView({
  interactionType = "VIEW",
  targetType,
  targetId,
  context,
}: {
  interactionType?: InteractionType;
  targetType: TargetType;
  targetId?: string;
  context?: Record<string, unknown>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(interactionType, targetType, { targetId, context });
  }, [interactionType, targetType, targetId, context]);
  return null;
}
