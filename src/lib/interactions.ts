import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { InteractionType, TargetType } from "@/generated/prisma/client";

type LogInput = {
  userId: string;
  interactionType: InteractionType;
  targetType: TargetType;
  targetId?: string | null;
  context?: Prisma.InputJsonValue;
};

// Fire-and-forget behavioral logging into UserInteraction. Runs inside Next's
// after() so it NEVER adds latency to the triggering request, and never throws
// into the caller — instrumentation must not change app behavior. If there's no
// request scope (after() unavailable), the event is simply dropped.
export function logInteraction(input: LogInput): void {
  try {
    after(async () => {
      try {
        await prisma.userInteraction.create({
          data: {
            userId: input.userId,
            interactionType: input.interactionType,
            targetType: input.targetType,
            targetId: input.targetId ?? null,
            context: input.context,
          },
        });
      } catch (e) {
        console.error("[logInteraction]", e);
      }
    });
  } catch {
    /* no request scope — skip */
  }
}
