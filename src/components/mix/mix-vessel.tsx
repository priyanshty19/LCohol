"use client";

import { colorFor } from "@/lib/mix-colors";

export type Layer = { slug: string; name: string; category: string };

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    // Three.js r163+ only supports WebGL 2. Treating a WebGL 1 context as
    // compatible sends older Android GPUs into <Canvas>, where WebGLRenderer
    // throws and leaves the Mix Lab stage blank instead of using the fallback.
    const context = c.getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

// Static layered-glass fallback for the rare no-WebGL case (the gamified scene is
// always-on 3D otherwise — reduced-motion is intentionally not gated here per the
// product decision to keep the Mix Lab a motion-led game).
export function CssVessel({ layers }: { layers: Layer[] }) {
  return (
    <div className="relative mx-auto h-72 w-44">
      <div className="absolute inset-0 rounded-b-[2.5rem] rounded-t-lg border-2 border-foreground/25 bg-foreground/[0.03] shadow-inner" />
      <div className="absolute inset-[3px] flex flex-col-reverse overflow-hidden rounded-b-[2.3rem] rounded-t-md">
        {layers.map((layer) => (
          <div
            key={layer.slug}
            style={{ backgroundColor: colorFor(layer.category, layer.slug, layer.name) }}
            className="flex-1 border-t border-black/10 first:border-t-0"
          />
        ))}
      </div>
      <div className="absolute left-[3px] right-[3px] top-[3px] h-2 rounded-t-md bg-white/10" />
    </div>
  );
}
