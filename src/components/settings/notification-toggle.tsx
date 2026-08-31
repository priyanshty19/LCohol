"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { resolvePushCapability } from "@/lib/push-capability";

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
  const userAgent = navigator.userAgent;
  const touchMac = navigator.maxTouchPoints > 1 &&
    (/Macintosh|Mac OS X/i.test(userAgent) || /MacIntel|iPad/i.test(navigator.platform));
  return (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    touchMac
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
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const capability = resolvePushCapability({
      appleMobile: isAppleMobileDevice(),
      standalone: isStandaloneApp(),
      serviceWorkerAvailable: "serviceWorker" in navigator,
      notificationAvailable: "Notification" in window,
      vapidConfigured: Boolean(VAPID),
    });
    if (capability !== "available") {
      const timer = window.setTimeout(() => setState(capability), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    (async () => {
      // Prepare the registration before the button is shown. On installed iOS
      // apps where window.Notification is absent, subscribe() itself must run
      // directly from the user's tap.
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      registrationRef.current = registration;
      const sub = await registration.pushManager.getSubscription();
      if (!active) return;
      if (sub) setState("on");
      else if ("Notification" in window && Notification.permission === "denied")
        setState("denied");
      else setState("default");
    })().catch((error) => {
      if (!active) return;
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't check push notification support.",
      );
      setState("error");
    });
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setErrorMessage("");
    try {
      // WebKit requires the permission prompt to remain attached to this user
      // gesture. Newer/installed WebKit builds can expose PushManager without
      // exposing window.Notification, so support both permission entry points.
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setState(perm === "denied" ? "denied" : "default");
          return;
        }
      }

      const registration = registrationRef.current;
      if (!registration) {
        throw new Error("Notifications are still preparing. Please wait a moment and try again.");
      }
      const sub = await registration.pushManager.subscribe({
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
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setState("denied");
        return;
      }
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
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = registration ? await registration.pushManager.getSubscription() : null;
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
      <p className="text-xs leading-relaxed text-muted-foreground">
        This device or browser doesn&apos;t expose Web Push. On iPhone or iPad, update iOS and install
        Sip Stories from the browser&apos;s Share → Add to Home Screen option.
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
