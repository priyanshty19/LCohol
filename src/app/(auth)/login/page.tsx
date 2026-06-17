import { SipStoriesMark } from "@/components/brand/logo";
import { AuthPanel } from "@/components/landing/auth-panel";
import { JamesTalking } from "@/components/landing/james-talking";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Welcome" };

const FEATURES = [
  { icon: "🥃", label: "Share sip stories anonymously" },
  { icon: "🍹", label: "Discover cocktails & bars near you" },
  { icon: "🤖", label: "Chat with James, your AI bartender" },
  { icon: "🎉", label: "Find your vibe, connect with the community" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── Left panel 30% — brand & what-it-is ── */}
      <div className="relative hidden w-[30%] flex-col justify-between border-r border-white/10 p-10 md:flex">
        <div className="flex flex-col gap-4">
          <div style={{ filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.22))" }}>
            <SipStoriesMark className="h-14 w-auto text-foreground" />
          </div>
          <div className="relative overflow-hidden">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              <span className="text-glow italic text-primary">Sip</span>{" "}
              <span className="text-foreground">Stories</span>
            </h1>
            <div className="fx-glare" style={{ left: 0 }} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            India&apos;s anonymous community for drinking culture. Stories,
            cocktails, bars, and more.
          </p>
        </div>

        <ul className="space-y-5">
          {FEATURES.map((f) => (
            <li
              key={f.label}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <span className="mt-0.5 text-base">{f.icon}</span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground">
          21+ only. Drink responsibly.
        </p>
      </div>

      {/* ── Right panel 70% — welcome, auth, James glimpse ── */}
      <div className="flex flex-1 flex-col px-6 py-12 md:px-12">
        {/* my-auto centers the column when short, but lets it grow + scroll
            when the signup form expands, instead of clipping at the top. */}
        <div className="mx-auto my-auto w-full max-w-md space-y-8">
          {/* Mobile-only brand (left panel hidden < md) */}
          <div className="flex flex-col items-center text-center md:hidden">
            <SipStoriesMark className="h-12 w-auto text-foreground" />
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              <span className="text-glow italic text-primary">Sip</span>{" "}
              <span className="text-foreground">Stories</span>
            </h1>
          </div>

          {/* Zone A — welcome (the desire) */}
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Pull up a stool.
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              India&apos;s anonymous tasting room. Drink stories, bar finds,
              cocktails, and James, our AI bartender, on call.
            </p>
          </div>

          {/* Zone B — the action (primary) */}
          <AuthPanel />

          {/* Zone C — quiet proof: a glimpse of James */}
          <div className="space-y-6">
            <div className="h-px bg-border/20" />
            <JamesTalking />
          </div>

          {/* Compliance footer */}
          <p className="text-center text-xs text-muted-foreground">
            This platform is for adults of legal drinking age only.
            <br />
            Drink responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
