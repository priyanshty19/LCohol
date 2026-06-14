import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="font-display text-7xl font-bold text-primary text-glow">404</h1>
      <p className="mt-4 font-display text-lg text-foreground">
        Looks like this page had one too many
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="gold">Back to Feed</Button>
      </Link>
    </div>
  );
}
