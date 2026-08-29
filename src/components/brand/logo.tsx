import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The exact approved martini-and-olive artwork, extracted from the supplied
 * high-resolution master with its background made transparent.
 */
export function SipStoriesMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/sipstories-mark-dark.png"
      alt=""
      width={707}
      height={1002}
      className={cn("object-contain", className)}
      priority
    />
  );
}

/** Full lockup: mark + "Sip Stories" wordmark (italic Sip, like the logo). */
export function SipStoriesLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SipStoriesMark className={cn("h-10 w-auto", markClassName)} />
      <span className="font-display text-xl leading-none tracking-tight">
        <span className="text-glow italic text-primary">Sip</span>{" "}
        <span className="text-foreground">Stories</span>
      </span>
    </span>
  );
}
