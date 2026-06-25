"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  type: string;
  postId: string | null;
  commentId: string | null;
  partyId: string | null;
  read: boolean;
  createdAt: string;
  actor: { profile: { username: string | null; displayName: string | null; avatarUrl: string | null } | null } | null;
};

const LABELS: Record<string, string> = {
  MENTION: "mentioned you in a comment",
  TAG: "tagged you in a post",
  SHARE: "shared your post",
  SEND: "sent you a post",
  PARTY_INVITE: "invited you to a party",
  RSVP: "responded to your party",
  CIRCLE_POST: "shared a new post",
};

function hrefFor(n: Notif): string {
  if (n.type === "PARTY_INVITE" || n.type === "RSVP") return n.partyId ? `/parties/${n.partyId}` : "/parties";
  return n.postId ? `/post/${n.postId}` : "#";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const r = await fetch("/api/notifications");
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.data ?? []);
      setUnread(d.unread ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    return () => clearInterval(t);
  }, []);

  async function openPanel() {
    setOpen(true);
    if (unread > 0) {
      setUnread(0);
      try {
        await fetch("/api/notifications/read", { method: "POST" });
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-foreground/80 transition hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-border/60 bg-popover p-1 text-popover-foreground shadow-2xl">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notifications
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              items.map((n) => {
                const name = n.actor?.profile?.displayName ?? n.actor?.profile?.username ?? "Someone";
                return (
                  <Link
                    key={n.id}
                    href={hrefFor(n)}
                    onClick={() => setOpen(false)}
                    className={
                      "flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-muted/50 " +
                      (n.read ? "" : "bg-primary/5")
                    }
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                      {(name[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{name}</span>{" "}
                      <span className="text-muted-foreground">{LABELS[n.type] ?? "did something"}</span>
                      <span className="block text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
