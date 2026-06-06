import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Age Verification Required",
};

export default function VerifyAgePage() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="space-y-6 pt-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl">21+</span>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Age Verification Required
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You must be 21 years or older to access SIPSTORIES. This is
            required by Indian law for platforms with alcohol-related content.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/signup" className="block">
            <Button className="w-full">
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
  );
}
