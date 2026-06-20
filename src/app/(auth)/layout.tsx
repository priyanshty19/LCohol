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
      <div className="relative min-h-[100dvh] overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-ambient" />
        {/* Shader is decorative only — keep it faint so text stays legible. */}
        <ShaderBackdropLazy className="pointer-events-none absolute inset-0 -z-0 opacity-30" />

        <div
          className="fx-orb"
          style={{
            top: "-12%",
            left: "-10%",
            height: "40vh",
            width: "40vh",
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        />
        <div
          className="fx-orb"
          style={{
            bottom: "-14%",
            right: "-12%",
            height: "44vh",
            width: "44vh",
            background: "color-mix(in srgb, var(--accent) 30%, transparent)",
            animationDelay: "-6s",
          }}
        />
        {/* Sparkles intentionally omitted here — on the pale landing surface
            they read as stray red specks and hurt readability. */}
        <div className="pointer-events-none absolute inset-0 bg-grain opacity-25" />

        <div className="relative z-10">{children}</div>
      </div>
    </ClerkProvider>
  );
}
