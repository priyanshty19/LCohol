"use client";

import { useEffect, useState } from "react";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

type Triplet = { c1: string; c2: string; c3: string };

const FALLBACK: Triplet = { c1: "#160d0e", c2: "#7e1f2b", c3: "#c43049" };

function readShaderColors(): Triplet {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const c1 = s.getPropertyValue("--shader-1").trim();
  const c2 = s.getPropertyValue("--shader-2").trim();
  const c3 = s.getPropertyValue("--shader-3").trim();
  return { c1: c1 || FALLBACK.c1, c2: c2 || FALLBACK.c2, c3: c3 || FALLBACK.c3 };
}

// Ambient WebGL plane whose colors track the active [data-theme]. Decorative.
export default function ShaderBackdrop() {
  const [colors, setColors] = useState<Triplet>(FALLBACK);

  useEffect(() => {
    setColors(readShaderColors());
    const onTheme = () => setColors(readShaderColors());
    window.addEventListener("themechange", onTheme);
    // Also catch theme changes made without our helper (e.g. devtools).
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      window.removeEventListener("themechange", onTheme);
      mo.disconnect();
    };
  }, []);

  return (
    <ShaderGradientCanvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      pointerEvents="none"
    >
      <ShaderGradient
        control="props"
        animate="on"
        type="waterPlane"
        color1={colors.c1}
        color2={colors.c2}
        color3={colors.c3}
        uSpeed={0.2}
        uStrength={1.8}
        uDensity={1.3}
        brightness={1.05}
        grain="on"
        cDistance={3.6}
        cAzimuthAngle={180}
        cPolarAngle={90}
        reflection={0.1}
      />
    </ShaderGradientCanvas>
  );
}
