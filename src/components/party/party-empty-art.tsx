/**
 * Line-art "the bar is set, nobody's here yet" illustration for the Parties
 * empty state — string lights strung over a table of empty glassware, drawn in
 * the vibe's own accent so it retints with every theme. Pure SVG (no photo, no
 * character art) so it stays crisp at any size and ships no extra bytes.
 */
export function PartyEmptyArt({ className }: { className?: string }) {
  // Bulbs hang from a slack catenary; hand-placed so the spacing reads natural.
  const bulbs = [
    { x: 28, y: 46 },
    { x: 62, y: 57 },
    { x: 98, y: 64 },
    { x: 136, y: 67 },
    { x: 174, y: 65 },
    { x: 210, y: 58 },
    { x: 244, y: 47 },
    { x: 272, y: 36 },
  ];

  return (
    <svg
      viewBox="0 0 300 200"
      className={className}
      role="img"
      aria-label="String lights hung above a table of empty cocktail glasses"
    >
      <defs>
        <radialGradient id="pe-bulb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
          <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pe-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <g className="text-foreground">
        {/* Slack wire */}
        <path
          d="M6 26 Q150 96 294 20"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.32"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Bulbs — soft bloom behind a small filament circle */}
        {bulbs.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y + 7} r="13" fill="url(#pe-bulb)" />
            <line
              x1={b.x}
              y1={b.y - 3}
              x2={b.x}
              y2={b.y + 2}
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="1.2"
            />
            <circle
              cx={b.x}
              cy={b.y + 7}
              r="4.2"
              fill="var(--primary)"
              fillOpacity="0.9"
            />
          </g>
        ))}

        {/* Table */}
        <path d="M40 150 L260 150 L246 162 L54 162 Z" fill="url(#pe-table)" />
        <path
          d="M40 150 L260 150 L246 162 L54 162 Z"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <line x1="66" y1="162" x2="66" y2="188" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1.4" />
        <line x1="234" y1="162" x2="234" y2="188" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1.4" />

        {/* Coupe (left) */}
        <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M96 108 Q112 132 128 108" />
          <line x1="112" y1="132" x2="112" y2="146" />
          <line x1="103" y1="149" x2="121" y2="149" />
          <line x1="94" y1="108" x2="130" y2="108" />
        </g>

        {/* Wine glass (centre, tallest) */}
        <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M144 92 Q144 122 156 124 Q168 122 168 92 Z" />
          <line x1="156" y1="124" x2="156" y2="145" />
          <line x1="147" y1="148" x2="165" y2="148" />
        </g>

        {/* Martini (right) */}
        <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M184 106 L206 130 L228 106 Z" />
          <line x1="206" y1="130" x2="206" y2="146" />
          <line x1="197" y1="149" x2="215" y2="149" />
        </g>
      </g>
    </svg>
  );
}
