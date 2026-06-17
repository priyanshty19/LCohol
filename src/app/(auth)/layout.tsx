import { ClerkProvider } from "@clerk/nextjs";
import { ShaderBackdropLazy } from "@/components/fx/shader-backdrop.lazy";

// Clerk is scoped to the auth route group only — it powers the email-OTP
// forms here, but the rest of the app runs on our own ss_auth session.
// Layout is intentionally thin: backdrop + provider only. Each page owns
// its own structural layout (split, card, centered, etc.).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-ambient" />
        <ShaderBackdropLazy />

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
            background:
              "color-mix(in srgb, var(--ml-velvet-bright) 22%, transparent)",
            animationDelay: "-3s",
          }}
        />
        <span className="fx-sparkle" style={{ top: "18%", left: "22%" }} />
        <span
          className="fx-sparkle"
          style={{ top: "26%", right: "18%", animationDelay: "-1.2s" }}
        />
        <span
          className="fx-sparkle"
          style={{ bottom: "24%", left: "16%", animationDelay: "-2.1s" }}
        />
        <span
          className="fx-sparkle"
          style={{ bottom: "32%", right: "24%", animationDelay: "-0.6s" }}
        />
        <span
          className="fx-sparkle"
          style={{ top: "44%", left: "40%", animationDelay: "-3.2s" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-grain opacity-60" />

        <div className="relative z-10">{children}</div>
      </div>
    </ClerkProvider>
  );
}
