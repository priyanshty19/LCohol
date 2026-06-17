import { SipStoriesMark } from "@/components/brand/logo";
import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div style={{ filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.22))" }}>
            <SipStoriesMark className="h-16 w-auto text-foreground" />
          </div>
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
        <div style={{ filter: "drop-shadow(0 24px 56px rgba(0,0,0,0.20))" }}>
          <SignupForm />
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
