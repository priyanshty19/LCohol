# 🍸 SIPSTORIES

An India-focused drinks & social community — share stories, discover drinks and bars, mix cocktails, and get a hand from **James**, the in-app AI bartender. Built with Next.js (App Router), React, Prisma, Supabase, Base UI, and Tailwind.

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (Supabase + DB URL, etc.)
cp .env.example .env.local   # then fill in values

# 3. Generate the Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# 4. (Optional) seed data
npx prisma db seed            # core seed
npx tsx prisma/seed-bars.ts   # bars
npx tsx prisma/seed-posts.ts  # feed posts
npx tsx prisma/seed-admins.ts # admin/moderator accounts

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. Production build: `npm run build`.

## Tech Stack

- **Framework:** Next.js (App Router) + React, TypeScript
- **Data:** Prisma ORM, Supabase (Postgres + auth helpers)
- **UI:** Base UI primitives, Tailwind CSS, custom glass/gold/velvet design system
- **AI:** James AI bartender (chat API + retriever)

---

## Updates

A running list of everything shipped in the recent overhaul, grouped by area.

### 🎨 Design system & theming
- New **glass / gold / velvet** button and card variants with display fonts and shared theme tokens (including `--ml-sos`) across `globals.css`, `button`, `card`, `badge`, and `input`.
- **Theme provider, theme switcher, and first-run vibe selection** so the look adapts to the user's chosen vibe.
- **Light "Day Lounge" theme** option.
- **Liquid-glass FX backdrop** (shader-based) plus the vendored `public/vendor/liquid-glass-js` library.
- Full visual restyle of every surface: feed, drinks, mix, hangover, vibe, profile, search, settings, auth, header, and mobile nav.

### ✨ New features
- **Mix Lab** — cocktail recipes and mixing surface.
- **Tonight's Vibe** — vibe-driven discovery, wired into the home sidebar.
- **Hangover SOS** — recovery protocols, a "when are you sober" calculation, and India-specific remedies.
- **Bars directory** — browse, map, and detail views with a bar reviews API.
- **James AI bartender** — in-app chat assistant with its own persona, knowledge retriever, and mini-games.
- **Onboarding quiz** and a **Help center**.
- **Moderation & Admin** — moderation queue, content report button, and an admin panel for users, moderators, and audit logs.

### 🔐 Platform & infrastructure
- **Auth rework** — signup API, password hashing, role-based access control (RBAC), API route guards, and rate limiting.
- **Image upload** with client-side compression.
- Utility layer — **referral** codes, **funky-name** generation, a **geolocation** hook, and client-cookie helpers.
- **Prisma schema** updates and seed scripts for admins, bars, and posts.

### ♿ Accessibility
- Fixed a Base UI `nativeButton` console warning: the home-sidebar "Get the Recipe" button renders a Next.js `Link` (an `<a>`), so it now sets `nativeButton={false}` to restore native button semantics (role + keyboard handling) for assistive tech, while keeping link navigation intact.

### 🧹 Housekeeping
- Added local-only `.backup_pregraphics/` and `references/` directories to `.gitignore`.

---

## Deployment

Deploys on [Vercel](https://vercel.com). See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
