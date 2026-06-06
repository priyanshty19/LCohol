@AGENTS.md

# SIPSTORIES

Anonymous social platform for drinking culture. Not a marketplace or delivery app.

## Tech Stack
- Next.js 15 (App Router, Server Components)
- TypeScript, Tailwind CSS, ShadCN UI
- Supabase (Auth, Postgres, Storage, Realtime)
- Prisma ORM
- OpenAI API (Phase 3)

## Key Patterns
- Dark mode first (class="dark" on html)
- Pseudonymous auth via Supabase — no real names required
- Server Components by default, 'use client' only for interactivity
- Prisma for all database queries (not Supabase client for DB)
- Supabase client for auth and storage only
- params is a Promise in Next.js 15 page components

## Database
- Schema in prisma/schema.prisma
- UUID primary keys everywhere
- Soft deletes (isDeleted flag) on posts/comments
- UserInteraction table logs everything for future AI

## Compliance
- Age gate (21+) required at signup with DOB
- No alcohol purchase links or actual prices
- Geo-disclaimers for prohibition states (Gujarat, Bihar, etc.)
- Responsible drinking messaging throughout
- IT Act safe harbor: T&C, Privacy Policy, Grievance Officer

## Commands
- `npm run dev` — dev server
- `npx prisma generate` — generate Prisma client
- `npx prisma migrate dev` — run migrations
- `npx prisma db seed` — seed database
