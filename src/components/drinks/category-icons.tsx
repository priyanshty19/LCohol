// Per-spirit line-art icons. Theme-aware (stroke = currentColor); the liquid is
// a faint currentColor fill. Clean geometric style (cf. brand/logo.tsx). Keyed
// by the DrinkCategory names; whisky/whiskey normalized. Falls back to a glass.

type IconProps = { className?: string };

const SVG = ({ className, children }: IconProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const liquid = "currentColor";

function Whisky({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M6 7h12l-1 12H7L6 7Z" />
      <path d="M6.6 12.5h10.8l-.5 6.5H7.1l-.5-6.5Z" fill={liquid} opacity={0.22} stroke="none" />
      <rect x="9" y="13.5" width="3" height="3" rx="0.6" opacity={0.5} />
    </SVG>
  );
}

function Beer({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M7 8h9v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8Z" />
      <path d="M16 10h2.5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 18.5 16H16" />
      <path d="M7 12h9v7H7v-7Z" fill={liquid} opacity={0.22} stroke="none" />
      <path d="M7 8c-.5-2 1.5-3 2.5-2 .8-1.8 3.2-1.8 4 0 1.2-.8 3 .2 2.5 2" />
    </SVG>
  );
}

function Wine({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M7 4h10l-.6 5a4.4 4.4 0 0 1-8.8 0L7 4Z" />
      <path d="M7.4 7.5h9.2a4.4 4.4 0 0 1-9.2 0Z" fill={liquid} opacity={0.25} stroke="none" />
      <path d="M12 13.5V20M8.5 20h7" />
    </SVG>
  );
}

function Gin({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M8 4h8v15a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4Z" />
      <path d="M8 11h8v8H8v-8Z" fill={liquid} opacity={0.2} stroke="none" />
      <circle cx="12" cy="9" r="1.4" opacity={0.6} />
      <path d="M14.5 13.5c1-1 2.2-1 2.6-.2" opacity={0.6} />
    </SVG>
  );
}

function Vodka({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M10 3h4v3l1.5 2.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V8.5L10 6V3Z" />
      <path d="M8.5 13h7v6.5h-7V13Z" fill={liquid} opacity={0.2} stroke="none" />
      <path d="M9.5 11h5" opacity={0.5} />
    </SVG>
  );
}

function Rum({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M6 8c0-1 .8-2 6-2s6 1 6 2v9c0 1-.8 2-6 2s-6-1-6-2V8Z" />
      <path d="M6 8c0 1 .8 2 6 2s6-1 6-2" />
      <path d="M6.4 12c1.2.7 3.3 1 5.6 1s4.4-.3 5.6-1v5c0 1-.8 2-5.6 2s-5.6-1-5.6-2v-5Z" fill={liquid} opacity={0.2} stroke="none" />
    </SVG>
  );
}

function Brandy({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M6.5 9a5.5 5.5 0 0 0 11 0c0-2-1-3-1-3H7.5s-1 1-1 3Z" />
      <path d="M7 11.5a5 5 0 0 0 10 0Z" fill={liquid} opacity={0.25} stroke="none" />
      <path d="M12 14.5V19M9 19h6" />
    </SVG>
  );
}

function Tequila({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M8.5 8h7l-1 11h-5l-1-11Z" />
      <path d="M9 12.5h6l-.5 6.5h-5L9 12.5Z" fill={liquid} opacity={0.22} stroke="none" />
      <path d="M5 7l2-3M7 7L7 3.5M9 7 7.5 4" opacity={0.6} />
    </SVG>
  );
}

function Liqueur({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M8 6h8l-2.2 6.5h-3.6L8 6Z" />
      <path d="M9.4 9h5.2l-.9 3h-3.4l-.9-3Z" fill={liquid} opacity={0.28} stroke="none" />
      <path d="M12 12.5V19M9 19h6" />
    </SVG>
  );
}

function GlassFallback({ className }: IconProps) {
  return (
    <SVG className={className}>
      <path d="M5 5h14l-6 7v7M11 19h2M9 19h6" />
      <path d="M7.2 7h9.6L13 11.5h0L7.2 7Z" fill={liquid} opacity={0.2} stroke="none" />
    </SVG>
  );
}

const ICONS: Record<string, (p: IconProps) => React.ReactNode> = {
  whisky: Whisky,
  whiskey: Whisky,
  beer: Beer,
  wine: Wine,
  gin: Gin,
  vodka: Vodka,
  rum: Rum,
  brandy: Brandy,
  tequila: Tequila,
  liqueur: Liqueur,
};

/** Resolve a spirit category (name or slug) to its line-art icon. */
export function CategoryIcon({
  category,
  className,
}: {
  category?: string | null;
  className?: string;
}) {
  const key = (category ?? "").trim().toLowerCase();
  // match the leading word so "London Dry Gin", "Single Malt Whisky" etc. resolve
  const Icon =
    ICONS[key] ??
    ICONS[Object.keys(ICONS).find((k) => key.includes(k)) ?? ""] ??
    GlassFallback;
  return <>{Icon({ className })}</>;
}
