import { ShaderBackdropLazy } from "@/components/fx/shader-backdrop.lazy";
import { SipStoriesMark } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient backdrop (CSS fallback + optional WebGL shader) */}
      <div className="pointer-events-none absolute inset-0 bg-ambient" />
      <ShaderBackdropLazy />

      {/* Floating gradient orbs — colored from the active theme */}
      <div
        className="fx-orb"
        style={{
          top: "-8%",
          left: "-6%",
          height: "42vh",
          width: "42vh",
          background: "color-mix(in srgb, var(--primary) 32%, transparent)",
        }}
      />
      <div
        className="fx-orb"
        style={{
          bottom: "-10%",
          right: "-8%",
          height: "48vh",
          width: "48vh",
          background: "color-mix(in srgb, var(--accent) 65%, transparent)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="fx-orb"
        style={{
          top: "28%",
          right: "10%",
          height: "26vh",
          width: "26vh",
          background: "color-mix(in srgb, var(--ml-velvet-bright) 22%, transparent)",
          animationDelay: "-3s",
        }}
      />

      {/* Sparkles */}
      <span className="fx-sparkle" style={{ top: "18%", left: "22%" }} />
      <span className="fx-sparkle" style={{ top: "26%", right: "18%", animationDelay: "-1.2s" }} />
      <span className="fx-sparkle" style={{ bottom: "24%", left: "16%", animationDelay: "-2.1s" }} />
      <span className="fx-sparkle" style={{ bottom: "32%", right: "24%", animationDelay: "-0.6s" }} />
      <span className="fx-sparkle" style={{ top: "44%", left: "40%", animationDelay: "-3.2s" }} />

      <div className="pointer-events-none absolute inset-0 bg-grain opacity-60" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div style={{ filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.22))" }}>
            <SipStoriesMark className="h-16 w-auto text-foreground" />
          </div>
          {/* Wordmark with a periodic glare sweep (clipped to the text box) */}
          <div className="relative mt-3 overflow-hidden px-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              <span className="text-glow italic text-primary">Sip</span>{" "}
              <span className="text-foreground">Stories</span>
            </h1>
            <div className="fx-glare" style={{ left: 0 }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Stories worth sipping on
          </p>
        </div>

        {/* Auth card with an elevated shadow */}
        <div style={{ filter: "drop-shadow(0 24px 56px rgba(0,0,0,0.20))" }}>
          {children}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This platform is for adults of legal drinking age only.
          <br />
          Drink responsibly.
        </p>
      </div>
    </div>
  );
}
