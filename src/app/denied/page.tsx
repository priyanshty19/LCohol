import type { Metadata } from "next";

export const metadata: Metadata = { title: "Access Denied" };

export default function DeniedPage() {
  return (
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="glass-panel-elevated max-w-sm space-y-6 rounded-2xl p-8">
        <div className="text-6xl">🚫</div>
        <h1 className="font-display text-3xl font-bold text-primary text-glow">
          Access Denied
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          This is a private beta. Only invited guests can access SIPSTORIES.
          <br />
          If you believe this is a mistake, contact the host.
        </p>
        <a
          href="/api/auth/logout"
          className="btn-gold inline-flex min-h-[44px] items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Sign out and return to login
        </a>
        <p className="font-display text-xs text-muted-foreground/50">
          SIPSTORIES · Private Beta
        </p>
      </div>
    </div>
  );
}
