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

type State = "loading" | "unsupported" | "install-required" | "default" | "denied" | "error" | "on";

function isAppleMobileDevice() {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const isAppleMobile = isAppleMobileDevice();
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("Notification" in window) ||
      !VAPID
    ) {
      const timer = window.setTimeout(() => setState("unsupported"), 0);
      return () => window.clearTimeout(timer);
    }
    if (isAppleMobile && !isStandaloneApp()) {
      const timer = window.setTimeout(() => setState("install-required"), 0);
      return () => window.clearTimeout(timer);
    }
    if (!Reflect.has(window, "PushManager")) {
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
    setErrorMessage("");
    try {
      // WebKit requires the permission prompt to remain attached to this user
      // gesture. Do not await service-worker work before requesting permission.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "Couldn't save this device for push notifications.");
      }
      setState("on");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't enable push notifications.",
      );
      setState("error");
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
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't turn off push notifications.",
      );
      setState("error");
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
  if (state === "install-required") {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Add Sip Stories to your Home Screen first: in Safari tap Share → Add to Home Screen, open
        Sip Stories from its new icon, then return here to enable notifications.
      </p>
    );
  }
  if (state === "denied") {
    const deviceSettings = isAppleMobileDevice() ? "iPhone or iPad" : "your device";
    return (
      <p className="text-xs text-muted-foreground">
        Notifications are blocked. Open {deviceSettings} Settings → Notifications → Sip Stories,
        allow notifications, then refresh.
      </p>
    );
  }
  if (state === "error") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
        <Button variant="outline" size="sm" onClick={enable} disabled={busy}>
          {busy ? "Trying…" : "Try again"}
        </Button>
      </div>
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
        Tap once to let Apple or Android add Sip Stories to this device&apos;s notification settings.
      </span>
      <Button variant="gold" size="sm" onClick={enable} disabled={busy}>
        {busy ? "Enabling…" : "Enable notifications"}
      </Button>
    </div>
  );
}
