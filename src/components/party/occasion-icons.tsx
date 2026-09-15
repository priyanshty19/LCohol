import type { CSSProperties } from "react";

/** Neon line-art glyphs for the occasion picker — they inherit `currentColor`
 *  so each tile can tint its own icon with the occasion's hue. */
type IconProps = { className?: string; style?: CSSProperties };

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HousePartyIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
      <path d={"M5 15 L16 6 L27 15"} {...S} />
      <path d="M8 14 V26 H24 V14" {...S} />
      <path d="M14 26 V19 H18 V26" {...S} />
      <circle cx="10.5" cy="9.5" r="1.3" {...S} />
      <circle cx="22" cy="10.5" r="1.3" {...S} />
    </svg>
  );
}

export function ClubNightIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
      <circle cx="16" cy="12" r="7" {...S} />
      <path d="M9.5 9 H22.5 M9.5 15 H22.5 M16 5 V19 M12 5.8 V18.2 M20 5.8 V18.2" {...S} />
      <path d="M16 19 V24" {...S} />
      <path d="M10 27 Q16 23 22 27" {...S} />
    </svg>
  );
}

export function CelebrationIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
      <path d="M9 27 L17 12 L23 18 Z" {...S} />
      <path d="M20 9 L21.5 5.5 M24 12 L27.5 10.5 M22.5 6.5 L26 8" {...S} />
      <circle cx="13" cy="7" r="1.2" {...S} />
      <circle cx="27" cy="17" r="1.2" {...S} />
    </svg>
  );
}

export function CasualHangoutIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
      <path d="M7 9 H14 L13 20 A2.5 2.5 0 0 1 8 20 Z" {...S} />
      <path d="M18 9 H25 L24 20 A2.5 2.5 0 0 1 19 20 Z" {...S} />
      <path d="M10.5 22.5 V27 M21.5 22.5 V27" {...S} />
      <path d="M7.5 12.5 H13.6 M18.4 12.5 H24.5" {...S} />
    </svg>
  );
}

export function WeekendChillIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
      <path d="M21 5.5 A10 10 0 1 0 26.5 17 A8 8 0 0 1 21 5.5 Z" {...S} />
      <path d="M7 8.5 L8.6 10.1 M8.6 8.5 L7 10.1" {...S} />
      <circle cx="12" cy="5.5" r="0.9" {...S} />
    </svg>
  );
}
