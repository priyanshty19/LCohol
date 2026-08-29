import type { Metadata } from "next";
import Link from "next/link";
import { SipStoriesMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Age Verification Required",
  robots: { index: false, follow: false },
};

export default function VerifyAgePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <SipStoriesMark className="h-14 w-auto text-foreground" />
          <div className="relative mt-3 overflow-hidden px-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              <span className="text-glow italic text-primary">Sip</span>{" "}
              <span className="text-foreground">Stories</span>
            </h1>
          </div>
        </div>
    <Card variant="glass">
      <CardContent className="space-y-6 pt-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ml-sos)]/10 text-[var(--ml-sos)] glow-danger">
          <span className="font-display text-2xl font-semibold">21+</span>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Age Verification Required
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You must be 21 years or older to access SIPSTORIES. This is
            required by Indian law for platforms with alcohol-related content.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/signup" className="block">
            <Button variant="gold" className="w-full">
              Create Account (21+ only)
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              Already have an account? Log in
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          By proceeding, you confirm that you are of legal drinking age in
          your jurisdiction. Misrepresenting your age is a violation of our
          Terms of Service.
        </p>
      </CardContent>
    </Card>
      </div>
    </div>
  );
}
