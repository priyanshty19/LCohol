import { JamesAvatar } from "@/components/james/james-avatar";

/**
 * Landing-page glimpse of James, the in-app AI bartender. This is a product
 * showcase (a canned sample exchange), NOT real user activity — the "Meet
 * James" header frames it as a feature demo. Copy follows his real persona
 * voice (see src/lib/james/persona.ts): suave, light Hinglish, bolds the
 * drink, one tasteful emoji, never an em-dash.
 */
export function JamesSpotlight() {
  return (
    <div className="glass-panel rounded-2xl p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
      <div className="flex items-center gap-3">
        <JamesAvatar className="h-11 w-11 shrink-0" />
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            Meet James
          </p>
          <p className="text-xs text-muted-foreground">
            Your AI bartender, on call
          </p>
        </div>
      </div>

      {/* Sample exchange — illustrative product demo, not a real conversation */}
      <div className="mt-4 space-y-2.5">
        <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-primary/15 px-3.5 py-2 text-xs leading-relaxed text-foreground/90">
          Got gin, lime, no tonic. What can I make?
        </div>
        <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-sm border border-border/40 bg-card/60 px-3.5 py-2 text-xs leading-relaxed text-foreground/90">
          A <span className="font-semibold text-primary">Gimlet</span>, boss. 🍸
          Two parts gin, one part fresh lime, a spoon of sugar. Shake it cold.
        </div>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        James is behind the bar the moment you&apos;re in.
      </p>
    </div>
  );
}
