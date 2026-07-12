# 🍸 SIPSTORIES

An India-focused drinks & social community — share stories, discover drinks and bars, mix cocktails, throw parties, and get a hand from **James**, the in-app AI bartender. Built with Next.js (App Router), React, Prisma, Supabase, Base UI, and Tailwind.

## TL;DR

SIPSTORIES is a pseudonymous, invite-only social app for India's drinking culture (21+, responsible-drinking guardrails throughout). This release makes it faster, more social, and more illustrative:

- **⚡ Faster pages** — list pages (feed, drinks, cocktails, bars, profile) now fetch their first page of data **on the server**, so content is in the initial HTML instead of after a client round-trip. Read-only catalog APIs are browser/CDN-cached.
- **🤝 Social graph** — **share** any post to your circle or **send** it to specific circle-mates (Instagram-style); **@mention/tag** circle members in posts and comments; a **notifications** bell ties it all together.
- **🎉 Parties** — create a houseparty or bar night, invite circle-mates (with RSVPs), or share a **public invite link** that lets a non-member join your circle and RSVP in one go.
- **⭐ Karma** — a real activity metric (circle friends + posts shared + posts interacted with + comments), recomputed as you act.
- **🥃 Richer drinks** — bespoke per-spirit SVG icons across drink cards, detail pages, James's chat results, and empty states.
- **🤵 James, agentic** — the bartender can now *act*: change the app's vibe, navigate, and pull up drink cards, not just chat — with the responsible-drinking rules enforced on every path.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (Supabase + DB URL, etc.)
cp .env.example .env.local   # then fill in values

# 3. Generate the Prisma client and sync the schema
npx prisma generate
npx prisma db push           # see "Schema changes" below — NOT `migrate dev`

# 4. (Optional) seed data
npx prisma db seed            # core seed
npx tsx prisma/seed-bars.ts   # bars
npx tsx prisma/seed-posts.ts  # feed posts
npx tsx prisma/seed-admins.ts # admin/moderator accounts

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. Production build: `npm run build`.

> **Schema changes:** this project's Supabase database was bootstrapped with `prisma db push`, so its schema does not match the `prisma/migrations/` history. **Use `npx prisma db push` for schema changes, not `prisma migrate dev`** — the latter sees the drift and wants to reset (drop all data). After a `db push` or `prisma generate`, **restart the dev server** so it picks up the regenerated Prisma client.

## Tech Stack

- **Framework:** Next.js (App Router) + React, TypeScript
- **Data:** Prisma ORM, Supabase (Postgres + auth helpers)
- **UI:** Base UI primitives, Tailwind CSS, custom glass/gold/velvet design system, `motion` for interactions
- **AI:** James AI bartender — agentic chat (Groq `llama-3.3-70b`) with a directive action protocol + catalog retriever

---

## Updates

A running list of everything shipped, newest first, grouped by area.

### 🚀 Latest: performance, social graph, parties & richer drinks

**Performance — server-side initial fetch**
- Feed, drinks, cocktails, bars, and profile pages fetch their first page server-side and seed the client view from props, eliminating the `HTML → JS → fetch → render` waterfall. Each route's query is extracted to a shared `src/lib/*.ts` used by both the page (initial render) and the API route (pagination/filters).
- Client views re-fetch only on real interaction (a **StrictMode-safe signature guard** skips the mount fetch).
- Browser/CDN `Cache-Control` on public catalog APIs (`/api/drinks`, `/api/drinks/filters`, `/api/bars`, `/api/cocktails`); request-deduped `getCurrentUser` (React `cache`); `next/font` `display: swap`.

**Post sharing**
- A share sheet on every post: **re-share to your circle** or **send to specific circle members**. Visibility-authorized (you can only share a post you can actually see). New `PostShare` / `PostSend` models.

**Tagging, mentions & notifications**
- **Tag** circle members in a post and **@mention** them in comments (restricted to your circle); mentions render as profile links.
- A **notifications** bell (unread badge + panel) for mentions, tags, shares, sends, party invites, and RSVPs. New `Mention` / `Notification` models.

**Karma (activity metric)**
- `Profile.shots` is now a live **Karma** score = circle friends + posts shared + posts interacted with + comments, recomputed on each action.

**Parties**
- Create a party (houseparty or a listed bar), invite circle-mates with **RSVPs** (Going / Maybe / Can't), and generate a **shareable invite link**. The link doubles as a referral, so a non-member who opens it can sign up, join the host's circle, and RSVP in one flow. New `PartyInvite` model + `PartyPlan` venue/date/status fields. Motion-designed create flow and detail view.

**Richer drink visuals**
- A bespoke per-spirit SVG icon set (whisky, gin, rum, vodka, beer, wine, brandy, tequila, liqueur) on drink cards, the detail header, James's chat result cards, and empty states.

**James, the agentic bartender**
- The top-of-feed "Ask James" composer is now a conversational agent that can **change the app vibe, navigate, and surface drink/cocktail cards** via a `%%ACTION%%` directive protocol — with the responsible-drinking guardrails enforced on every action.

### 🎨 Design system & theming
- New **glass / gold / velvet** button and card variants with display fonts and shared theme tokens (including `--ml-sos`) across `globals.css`, `button`, `card`, `badge`, and `input`.
- **Theme provider, theme switcher, and a daily vibe prompt** (re-asks each calendar day) so the look adapts to the user's chosen vibe.
- **Light "Day Lounge" theme** option.
- **Shader FX backdrop** with theme-aware ambient colors.
- Full visual restyle of every surface: feed, drinks, mix, hangover, vibe, profile, search, settings, auth, header, and mobile nav.

### ✨ Earlier features
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
- Toggle/disclosure controls expose `aria-pressed` / `aria-controls`; loading states use a polite `TextLoader`.
- Fixed a Base UI `nativeButton` console warning on the home-sidebar "Get the Recipe" button.

---

## Deployment

Deploys on [Vercel](https://vercel.com). See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
