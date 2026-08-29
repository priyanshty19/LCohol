import { cn } from "@/lib/utils";

type Props = {
  name: string;
  category?: string | null;
  kind?: "drink" | "cocktail";
  className?: string;
};

const PALETTES = [
  ["#6f102c", "#d66a43", "#f4c77e"],
  ["#173f46", "#4d998e", "#e4c979"],
  ["#38255d", "#9f4d83", "#efb76f"],
  ["#503018", "#b46f36", "#f1d39a"],
] as const;

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

/**
 * A zero-storage editorial fallback for catalog items without photography.
 * It intentionally reads as artwork (not a broken/empty image) and varies by
 * drink name, while user-uploaded photography still takes precedence.
 */
export function DefaultDrinkArtwork({ name, category, kind = "drink", className }: Props) {
  const palette = PALETTES[hash(`${name}:${category ?? ""}`) % PALETTES.length];
  const isCocktail = kind === "cocktail";

  return (
    <div
      className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(145deg, ${palette[0]}, ${palette[1]})` }}
      role="img"
      aria-label={`Illustrated placeholder for ${name}`}
    >
      <div className="absolute -left-[18%] -top-[24%] h-[68%] w-[68%] rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-[30%] -right-[20%] h-[75%] w-[75%] rounded-full bg-black/20 blur-2xl" />
      <svg viewBox="0 0 180 180" className="relative h-[72%] w-[72%] drop-shadow-2xl" aria-hidden="true">
        {isCocktail ? (
          <>
            <path d="M35 37h110L99 94v41" fill="none" stroke="#fff8eb" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M67 142h64" fill="none" stroke="#fff8eb" strokeWidth="6" strokeLinecap="round" />
            <path d="M48 51h84L96 88H79z" fill={palette[2]} opacity=".9" />
            <circle cx="129" cy="43" r="15" fill="#91bd54" stroke="#fff8eb" strokeWidth="4" />
            <path d="M129 28 86 88" stroke="#fff8eb" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M72 29h36v20l12 14v79c0 7-5 12-12 12H72c-7 0-12-5-12-12V63l12-14z" fill="#fff8eb" opacity=".92" />
            <path d="M68 82h44v47H68z" fill={palette[2]} opacity=".96" />
            <path d="M76 38h28" stroke={palette[0]} strokeWidth="7" strokeLinecap="round" />
            <path d="M78 94h24M78 105h24M78 116h16" stroke={palette[0]} strokeWidth="4" strokeLinecap="round" opacity=".72" />
          </>
        )}
      </svg>
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-[#fff8eb]">
        <span className="line-clamp-1 font-display text-xs font-semibold tracking-wide">{name}</span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] opacity-70">Sip Stories</span>
      </div>
    </div>
  );
}
