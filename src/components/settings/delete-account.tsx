"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Step = "nudge" | "confirm";

// Deletion is gated behind a retention nudge: a calm entry button → a "before you
// go" pitch (Stay / Leave) → only on Leave does the actual delete + feedback
// surface. Feedback (and, with explicit consent, the email) is captured server-side
// before the data purge.
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("nudge");
  const [feedback, setFeedback] = useState("");
  const [keepEmail, setKeepEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Personalized retention pitch — the under-used feature most worth pitching,
  // chosen from the user's behavior. Falls back to the Mix Lab pitch.
  const [pitch, setPitch] = useState<{ headline: string; body: string; href: string } | null>(null);

  function reset() {
    setStep("nudge");
    setFeedback("");
    setKeepEmail(false);
    setError(null);
    setBusy(false);
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined, keepEmail }),
      });
      if (!res.ok) {
        setError("Could not delete your account. Please try again.");
        setBusy(false);
        return;
      }
      // Full reload so all cached auth/state is gone.
      window.location.href = "/login";
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          fetch("/api/me/pitch")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.pitch && setPitch(d.pitch))
            .catch(() => {});
        } else {
          reset();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        Want to delete your account?
      </DialogTrigger>

      <DialogContent>
        {step === "nudge" ? (
          <>
            <DialogHeader>
              <DialogTitle>Wait — before you go 🍸</DialogTitle>
              <DialogDescription>
                {pitch?.body ??
                  "Have you tried the 3D Mix Lab? Pour, stir and garnish your own cocktail, then save it to your shelf. Most people who build their first one stick around for the next round."}
              </DialogDescription>
            </DialogHeader>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
                router.push(pitch?.href ?? "/mix");
              }}
              className="w-full rounded-lg border border-[var(--ml-velvet-bright)]/30 bg-card p-3 text-left text-sm transition hover:border-[var(--ml-velvet-bright)]/60"
            >
              ✨ <span className="font-medium">{pitch?.headline ?? "Open the Mix Lab"}</span>
              <span className="block text-xs text-muted-foreground">
                Takes 30 seconds. No commitment.
              </span>
            </button>

            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setStep("confirm")}
              >
                Leave anyway
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                I&apos;ll stay
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Sorry to see you go</DialogTitle>
              <DialogDescription>
                This permanently erases your profile, posts, comments, parties,
                connections and notifications. It can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="leave-feedback" className="text-xs text-muted-foreground">
                  Anything we could&apos;ve done better? (optional)
                </label>
                <Textarea
                  id="leave-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Your honest take helps us pour a better round."
                  rows={3}
                  maxLength={2000}
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={keepEmail}
                  onChange={(e) => setKeepEmail(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  You may keep my email with this feedback so the team can follow up.
                  Everything else is permanently erased — leave this unticked to erase
                  your email too.
                </span>
              </label>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setStep("nudge")}
              >
                Back
              </Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={handleDelete}>
                {busy ? "Deleting…" : "Delete account & data"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
