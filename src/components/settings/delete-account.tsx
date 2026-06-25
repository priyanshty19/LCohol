"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Irreversible: deletes the account + all data via DELETE /api/account, then
// hard-redirects to /login (full reload to drop any cached auth/state).
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setError("Could not delete your account. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = "/login";
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-sm font-medium text-destructive">Delete account</p>
      <p className="text-xs text-muted-foreground">
        Permanently erase your profile, posts, comments, parties, connections and
        everything else. This cannot be undone.
      </p>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          setConfirm("");
          setError(null);
        }}
      >
        <DialogTrigger render={<Button variant="destructive" size="sm" />}>
          Delete account &amp; data
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently erases your profile, posts, comments, votes,
              parties, connections and notifications. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="confirm-delete" className="text-xs text-muted-foreground">
              Type{" "}
              <span className="font-mono font-semibold text-foreground">DELETE</span>{" "}
              to confirm
            </label>
            <Input
              id="confirm-delete"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" disabled={busy} />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirm !== "DELETE" || busy}
              onClick={handleDelete}
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
