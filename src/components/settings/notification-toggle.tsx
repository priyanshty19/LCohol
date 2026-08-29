"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Base64url → Uint8Array, required for PushManager.subscribe's applicationServerKey.
// Backed by an explicit ArrayBuffer so the type is Uint8Array<ArrayBuffer> (a valid
// BufferSource) — TS 5.7+ otherwise infers the SharedArrayBuffer-inclusive
// ArrayBufferLike, which applicationServerKey rejects.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "default" | "denied" | "on";

export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID
    ) {
      const timer = window.setTimeout(() => setState("unsupported"), 0);
      return () => window.clearTimeout(timer);
    }
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub && Notification.permission === "granted") setState("on");
      else if (Notification.permission === "denied") setState("denied");
      else setState("default");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
      if (res.ok) setState("on");
    } catch (e) {
      console.error("[notifications] enable failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("default");
    } catch (e) {
      console.error("[notifications] disable failed", e);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <p className="text-xs text-muted-foreground">Checking…</p>;
  }
  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Push notifications aren&apos;t supported on this device.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Notifications are blocked in your device settings. Allow Sip Stories notifications there,
        then refresh.
      </p>
    );
  }
  if (state === "on") {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--ml-sober)]">
          Push is on for this device.
        </span>
        <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
          {busy ? "…" : "Turn off"}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        Get a push on this device when something happens.
      </span>
      <Button variant="gold" size="sm" onClick={enable} disabled={busy}>
        {busy ? "…" : "Enable"}
      </Button>
    </div>
  );
}
