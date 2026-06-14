/**
 * James — the house bartender. A composed, suave gentleman: slicked hair,
 * a refined pencil moustache, a knowing half-smile, crisp bowtie. Pure SVG.
 */
export function JamesAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <clipPath id="james-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <radialGradient id="james-bg" cx="42%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#3a262a" />
          <stop offset="100%" stopColor="#160d0e" />
        </radialGradient>
        <linearGradient id="james-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e3b485" />
          <stop offset="100%" stopColor="#c8915e" />
        </linearGradient>
      </defs>

      <g clipPath="url(#james-clip)">
        <rect width="64" height="64" fill="url(#james-bg)" />

        {/* tux + lapels */}
        <path d="M8 64 C10 49 21 45 32 45 C43 45 54 49 56 64 Z" fill="#140f0e" />
        <path d="M32 47 L24 64 H28 L32 52 L36 64 H40 Z" fill="#1d1614" />
        {/* collar */}
        <path d="M28 46 L32 53 L36 46 L33.5 44.5 H30.5 Z" fill="#f4ece0" />
        {/* bowtie — tints to the active vibe/theme accent */}
        <path d="M32 48 L27 45.6 V50.4 Z M32 48 L37 45.6 V50.4 Z" fill="var(--ml-velvet-bright)" />
        <rect x="30.8" y="46.6" width="2.4" height="2.8" rx="0.8" fill="#6e1828" />

        {/* neck */}
        <rect x="29" y="39" width="6" height="8" rx="2.5" fill="#bd854f" />
        {/* head */}
        <ellipse cx="32" cy="28" rx="11.5" ry="13" fill="url(#james-skin)" />
        {/* jaw shade for dimension */}
        <path d="M40 24 C43 30 40 38 32 40 C36 37 38 31 38 26 Z" fill="#b9824c" opacity="0.45" />

        {/* hair — slicked back, clean side part + sheen */}
        <path
          d="M20.5 25 C20 14 27 10.5 32 10.5 C37.5 10.5 44 14.5 43.5 26 C42 21.5 39.5 19.5 38.5 19 C39 22 30 23 26.5 20.5 C25.5 22 22 23 20.5 25 Z"
          fill="#1b1311"
        />
        <path d="M27 13.5 C31 11.8 37 12.4 40.5 16" stroke="#3a2a22" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* brows */}
        <path d="M25.5 24.4 C27.4 23.3 29.2 23.6 30.2 24.6" stroke="#1b1311" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M33.8 24.6 C34.8 23.6 36.6 23.3 38.5 24.4" stroke="#1b1311" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* eyes — almond, calm + confident */}
        <path d="M25.4 27.6 C26.6 26.6 28.6 26.6 29.6 27.6" stroke="#2a1a17" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M34.4 27.6 C35.4 26.6 37.4 26.6 38.6 27.6" stroke="#2a1a17" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="27.5" cy="28.1" r="1.05" fill="#241312" />
        <circle cx="36.5" cy="28.1" r="1.05" fill="#241312" />
        {/* nose */}
        <path d="M31.6 29 C31.2 31 30.8 32 32 32.6" stroke="#a9743f" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* refined pencil moustache */}
        <path d="M32 35 C30 33.8 27.5 33.6 25.8 34.4 C28 34.8 30.4 34.9 32 35 C33.6 34.9 36 34.8 38.2 34.4 C36.5 33.6 34 33.8 32 35 Z" fill="#1b1311" />
        {/* knowing half-smile */}
        <path d="M28.8 37.4 C30.6 38.7 33.4 38.7 35.4 37.2" stroke="#7a2e22" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="32" r="31" fill="none" stroke="var(--ml-velvet-bright)" strokeWidth="1.6" opacity="0.45" />
    </svg>
  );
}
