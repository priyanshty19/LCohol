export default function DeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-6 max-w-sm">
        <div className="text-6xl">🚫</div>
        <h1 className="text-3xl font-bold text-primary" style={{ fontFamily: "EB Garamond, serif" }}>
          Access Denied
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          This is a private beta. Only invited guests can access SIPSTORIES.
          <br />
          If you believe this is a mistake, contact the host.
        </p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Login
        </a>
        <p className="text-xs text-muted-foreground/50">
          SIPSTORIES · Private Beta
        </p>
      </div>
    </div>
  );
}
