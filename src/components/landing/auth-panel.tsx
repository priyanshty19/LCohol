"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

type Mode = null | "signin" | "signup";

// Rendered inside (auth)/layout.tsx which already provides ClerkProvider —
// do NOT wrap in a second ClerkProvider here.
export function AuthPanel() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => setMode(mode === "signin" ? null : "signin")}
          variant="default"
          size="lg"
          className={
            mode === "signup"
              ? "opacity-40 transition-opacity duration-300"
              : "transition-opacity duration-300"
          }
        >
          Sign In
        </Button>
        <Button
          onClick={() => setMode(mode === "signup" ? null : "signup")}
          variant="outline"
          size="lg"
          className={
            mode === "signin"
              ? "opacity-40 transition-opacity duration-300"
              : "transition-opacity duration-300"
          }
        >
          Create Account
        </Button>
      </div>

      {mode && (
        <div
          key={mode}
          className="animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <button
            onClick={() => setMode(null)}
            className="mb-4 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← back
          </button>
          {mode === "signin" ? <LoginForm /> : <SignupForm />}
        </div>
      )}
    </div>
  );
}
