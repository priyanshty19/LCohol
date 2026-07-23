"use client";

import { useEffect } from "react";
import {
  type LucideIcon,
  Phone,
  Car,
  Cross,
  Pill,
  Stethoscope,
  Droplets,
  Users,
} from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";

function maps(query: string, c: { lat: number; lng: number } | null) {
  return c
    ? `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${c.lat},${c.lng},15z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + " near me")}`;
}

function Tile({
  href,
  onClick,
  icon: Icon,
  title,
  sub,
  tone = "default",
}: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  title: string;
  sub: string;
  tone?: "default" | "danger" | "velvet";
}) {
  const cls =
    tone === "danger"
      ? "border-[var(--ml-sos)]/40 bg-[var(--ml-sos)]/10 text-[var(--ml-sos)]"
      : tone === "velvet"
        ? "glass-lapel"
        : "glass-panel";
  const inner = (
    <div
      className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 transition active:scale-[0.98] ${cls}`}
    >
      <Icon className="h-7 w-7 shrink-0" />
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold leading-tight">{title}</div>
        <div className="text-xs opacity-80">{sub}</div>
      </div>
    </div>
  );
  if (href) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="block"
      >
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
  );
}

export function HelpView() {
  const { coords, request } = useGeolocation();
  const { user } = useAuth();

  useEffect(() => {
    request();
  }, [request]);

  const phone = user?.emergencyPhone ?? null;
  const rideFallback = maps("cab or taxi", coords);

  function getHomeSafe() {
    const q = encodeURIComponent("cab taxi ride near me");
    const geo = coords ? `geo:${coords.lat},${coords.lng}?q=${q}` : `geo:0,0?q=${q}`;
    window.location.href = geo;
    window.setTimeout(() => {
      if (document.visibilityState === "visible") window.location.href = rideFallback;
    }, 900);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--ml-sos)]">
          Help Needed?
        </h1>
        <p className="text-sm text-muted-foreground">
          No judgement. Tap what you need — we&apos;ve got you.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Emergency
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile href="tel:112" icon={Phone} title="Call 112" sub="Police · ambulance · fire" tone="danger" />
          {phone ? (
            <Tile href={`tel:${phone}`} icon={Users} title="Call your person" sub={phone} tone="danger" />
          ) : (
            <Tile href="/settings#emergency-contact" icon={Users} title="Add an emergency contact" sub="Set it in Settings →" />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Get home safe
        </h2>
        <Tile
          icon={Car}
          title="Get home safe"
          sub="Open your device's ride or maps options"
          tone="velvet"
          onClick={getHomeSafe}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Find help nearby{coords ? "" : " · allow location"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile href={maps("hospital", coords)} icon={Cross} title="Hospital" sub="Nearest emergency" />
          <Tile href={maps("24 hour pharmacy", coords)} icon={Pill} title="Pharmacy" sub="Open now" />
          <Tile href={maps("clinic", coords)} icon={Stethoscope} title="Clinic" sub="Nearby" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Sober up
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile href="/hangover" icon={Droplets} title="Sober math & recovery" sub="When you'll be okay + India-specific remedies" tone="velvet" />
          <Tile
            icon={Users}
            title="Ask James"
            sub="He'll talk you through it"
            tone="velvet"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("ask-james", {
                  detail: { prompt: "I think I've had too much tonight — what should I do right now?" },
                })
              )
            }
          />
        </div>
      </section>

      <p className="rounded-xl border border-[var(--ml-sos)]/30 bg-[var(--ml-sos)]/5 p-3 text-center text-xs text-muted-foreground">
        Medical emergency? Call{" "}
        <a href="tel:112" className="font-semibold text-[var(--ml-sos)]">112</a>{" "}
        now. SIPSTORIES is a community platform, not a medical service.
      </p>
    </div>
  );
}
