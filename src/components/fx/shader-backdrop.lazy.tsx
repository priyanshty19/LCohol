"use client";

import dynamic from "next/dynamic";
import { useFxCapability } from "./use-fx-capability";

const ShaderBackdrop = dynamic(() => import("./shader-backdrop"), { ssr: false });

/**
 * Drop-in WebGL backdrop. Renders nothing when the device/preferences can't
 * afford it — the layout's CSS bg-ambient/bg-grain is the always-on fallback.
 */
export function ShaderBackdropLazy({ className }: { className?: string }) {
  const enabled = useFxCapability();
  if (!enabled) return null;
  return (
    <div className={className ?? "pointer-events-none absolute inset-0 -z-0 opacity-65"}>
      <ShaderBackdrop />
    </div>
  );
}
