"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SipStoriesMark } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { JamesTalking } from "@/components/landing/james-talking";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";

type Mode = null | "signin" | "signup";

const FEATURES = [
  { icon: "🥃", label: "Share sip stories anonymously" },
  { icon: "🍹", label: "Discover cocktails & bars near you" },
  { icon: "🤖", label: "Chat with James, your AI bartender" },
  { icon: "🎉", label: "Find your vibe, connect with the community" },
] as const;

// A glimpse of what's inside — fills the desktop hero and gives a first-time
// visitor a concrete reason to sign up.
const PEEKS = [
  {
    icon: "🥃",
    title: "Sip Stories",
    line: "Real nights, told anonymously.",
  },
  {
    icon: "🍸",
    title: "Cocktails",
    line: "40+ recipes, priced for your state.",
  },
  {
    icon: "📍",
    title: "Bars",
    line: "Finds across India's metros.",
  },
] as const;

function PeekStrip() {
  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
        A peek behind the bar
      </p>
      <div className="grid grid-cols-3 gap-3">
        {PEEKS.map((p) => (
          <div
            key={p.title}
            className="glass-panel-subtle rounded-xl border border-border/50 p-3.5 text-center transition-transform duration-300 hover:-translate-y-0.5"
          >
            <div className="text-xl">{p.icon}</div>
            <p className="mt-1.5 text-sm font-semibold text-foreground">
              {p.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {p.line}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Brand wordmark — reused across both layouts.
function Wordmark({ className }: { className?: string }) {
  return (
    <h1 className={className}>
      <span className="italic text-primary">Sip</span>{" "}
      <span className="text-foreground">Stories</span>
    </h1>
  );
}

// The auth control: two pills that swap in the matching form. Shared by both
// layouts; the parent owns `mode` so it can hide James while a form is open.
// Just the two entry buttons. These appear in BOTH the desktop and mobile
// layouts, but they only toggle the shared `mode` — the actual form lives in a
// single <AuthModal/> instance (below), so its state can never diverge between
// the two layouts.
function AuthButtons({ setMode }: { setMode: (m: Mode) => void }) {
  return (
    <div className="flex justify-center gap-3">
      <Button
        onClick={() => setMode("signin")}
        variant="default"
        size="lg"
        className="flex-1"
      >
        Sign In
      </Button>
      <Button
        onClick={() => setMode("signup")}
        variant="outline"
        size="lg"
        className="flex-1"
      >
        Create Account
      </Button>
    </div>
  );
}

// The ONE place the auth forms are mounted. Rendered once at the root of
// LoginExperience and shown as an overlay, so there's a single LoginForm /
// SignupForm instance (and a single Clerk flow) no matter the breakpoint.
function AuthModal({
  mode,
  setMode,
}: {
  mode: Exclude<Mode, null>;
  setMode: (m: Mode) => void;
}) {
  const close = () => setMode(null);

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackAnalyticsEvent("auth_start", { mode });
  }, [mode]);

  const isSignin = mode === "signin";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={close}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="mb-3 flex items-center justify-between">
          {/* Mode switch — keeps signin/signup in one place, no page nav */}
          <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-1 text-sm">
            <button
              onClick={() => setMode("signin")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                isSignin
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                !isSignin
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Single form instance — scrolls inside the dialog if tall */}
        <div className="overflow-y-auto">
          {isSignin ? <LoginForm /> : <SignupForm />}
        </div>
      </div>
    </div>
  );
}

function ComplianceNote({ className }: { className?: string }) {
  return (
    <p className={className}>
      For adults of legal drinking age only. Drink responsibly.
    </p>
  );
}

export function LoginExperience() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <>
      {/* ===================== DESKTOP (md+) =====================
          Two columns. The brand + James live on the LEFT, the auth flow on
          the RIGHT. Because they're side by side, opening a form never pushes
          James or scrolls the page — the right column scrolls on its own if a
          long form ever exceeds the viewport. */}
      <div className="hidden h-[100dvh] md:flex">
        {/* Left — brand, what-it-is, and a live glimpse of James */}
        <div className="flex w-[44%] max-w-xl flex-col justify-between border-r border-border/60 px-10 py-10 lg:px-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div style={{ filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.18))" }}>
                <SipStoriesMark className="h-11 w-auto text-foreground" />
              </div>
              <Wordmark className="font-display text-3xl font-semibold tracking-tight" />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-foreground/75">
              India&apos;s anonymous community for drinking culture — stories,
              cocktails, bars, and James, your AI bartender.
            </p>
            <ul className="space-y-3.5">
              {FEATURES.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3 text-sm text-foreground/80"
                >
                  <span className="text-base">{f.icon}</span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-6">
            <JamesTalking />
          </div>
        </div>

        {/* Right — the welcome + the action */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-10">
          <div className="w-full max-w-lg space-y-8">
            <div className="text-center">
              <h2 className="font-display text-5xl font-semibold tracking-tight text-foreground">
                Pull up a stool.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-foreground/75">
                India&apos;s anonymous tasting room. Drink stories, bar finds,
                cocktails, and James on call.
              </p>
            </div>

            <div className="mx-auto w-full max-w-md">
              <AuthButtons setMode={setMode} />
            </div>

            <PeekStrip />

            <ComplianceNote className="text-center text-xs text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ===================== MOBILE (< md) =====================
          One column locked to the viewport (no page scroll). Brand pinned top,
          compliance pinned bottom, the action centered between them. The auth
          form opens as a single shared overlay (AuthModal), so this column
          never reflows and the page never scrolls. */}
      <div className="flex h-[100dvh] flex-col overflow-hidden px-5 pb-4 pt-5 md:hidden">
        {/* Brand */}
        <div className="flex shrink-0 flex-col items-center text-center">
          <SipStoriesMark className="h-8 w-auto text-foreground" />
          <Wordmark className="mt-1.5 font-display text-2xl font-semibold tracking-tight" />
        </div>

        {/* Action band */}
        <div className="flex flex-1 flex-col justify-center gap-5 overflow-y-auto py-4">
          <div className="text-center">
            <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-foreground">
              Pull up a stool.
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-foreground/75">
              India&apos;s anonymous tasting room. Stories, bars, cocktails, and
              James on call.
            </p>
          </div>

          <AuthButtons setMode={setMode} />

          <JamesTalking compact />
        </div>

        {/* Compliance pinned bottom */}
        <ComplianceNote className="shrink-0 pt-2 text-center text-[11px] text-muted-foreground" />
      </div>

      {/* The ONE auth form instance, shared across both layouts. */}
      {mode && <AuthModal mode={mode} setMode={setMode} />}
    </>
  );
}
