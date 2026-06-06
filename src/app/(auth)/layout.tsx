export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            SIPSTORIES
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stories worth sipping on
          </p>
        </div>
        {children}
        <p className="text-center text-xs text-muted-foreground">
          This platform is for adults of legal drinking age only.
          <br />
          Drink responsibly.
        </p>
      </div>
    </div>
  );
}
