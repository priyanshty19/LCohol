# SIPSTORIES — Personalization Engine Roadmap (the long run)

V3 (PR #18) built the **substrate**: `UserInteraction` logging + `getBehaviorProfile`. This
doc plans how that data graduates from "retention nudge bait" into app-wide
personalization — personalized **feed**, **drink/cocktail recommendations**, and
**James suggestions** grounded in real behavior.

Guiding principle: **rules before models.** Most felt intelligence comes from
deterministic scoring over signals we already log. Reach for ML/embeddings only when
rules stop scaling. Every phase ships standalone value.

---

## Signals we collect (today + to add)

| Signal | Status | Source |
|---|---|---|
| search queries + result counts | ✅ V3 | `/api/search` |
| James asks (text) | ✅ V3 | `/api/james/agent` |
| post create / vote | ✅ V3 | posts, vote routes |
| Mix Lab save | ✅ V3 | cocktails/create |
| party RSVP | ✅ V3 | parties rsvp |
| drink + Mix Lab views | ✅ V3 | `<TrackView>` |
| cocktail / bar / profile views | ▢ add | `<TrackView>` (same pattern) |
| **impressions** (what was *shown*, not just clicked) | ▢ add | feed/rail render → beacon |
| dwell time (how long on a detail) | ▢ optional | unload beacon |
| reviews / ratings | exists (DrinkReview) | join in profile |
| onboarding prefs (cold start) | exists (Profile.preferredSpirits/Flavours) | join in profile |

---

## Phase 1 — Taste profile + read APIs (foundation)

Turn raw events into a **stable per-user taste model** the whole app can read cheaply.

- **`UserTasteProfile`** (new table or cache), refreshed periodically — affinity scores per
  spirit / flavour / category / occasion, derived from interactions + reviews + saves +
  onboarding prefs. Avoids `groupBy` over raw logs on every request (won't scale).
- Read helpers: `getTasteProfile(userId)`, `topAffinities(userId, dimension)`.
- **Cold start:** no interactions → fall back to onboarding `preferredSpirits/Flavours` +
  global popularity. Never show an empty personalized surface.
- **Complete instrumentation:** cocktail/bar/profile views + feed impressions.

## Phase 2 — Content-based recommendations (no ML infra)

Deterministic similarity over attributes we already have (tags, spirit, flavour, category).

- **"Because you liked X"** rails on Discover + detail pages — drinks/cocktails similar to
  ones the user viewed/saved/reviewed (Jaccard over tags / shared spirit+flavour).
- **"Picked for you"** rail: rank the catalog by taste-profile affinity.
- **James grounding:** inject `topAffinities` into the James system prompt so its
  suggestions match the user's demonstrated taste, not just their stated profile. (Reuses
  the existing persona/retriever pipeline — this is the cheapest high-impact win.)

## Phase 3 — Personalized feed ranking ("For You")

- New feed sort blending: recency × post score × **personal affinity** (authors you engage
  with, drinks/topics you like, your circle's activity). Start as a weighted formula
  alongside Hot/New/Top; tune weights from impression→engagement data.
- **Impression logging** to compute CTR and avoid re-showing the same posts.

## Phase 4 — Collaborative signals (needs data volume)

- Item-item collaborative filtering from the interaction matrix (co-views, co-saves):
  "people who saved this mix also saved…". Precompute nightly into an `ItemSimilarity`
  table (a Vercel cron job, same pattern as the retention purge).
- "Trending in your circle" — weight by connections' recent activity.

## Phase 5 — Learned models / embeddings (far future, at scale only)

- Drink/cocktail/post **embeddings** + vector similarity → semantic "similar drinks"
  (this is the genuine place for a vector store / RAG, not the retention nudge).
- A lightweight ranking model trained on logged engagement; churn prediction.

---

## Cross-cutting (must-haves, not phases)

- **Scale:** raw `groupBy` over `UserInteraction` degrades as volume grows → precomputed
  aggregate tables refreshed by a nightly job; consider an analytics store later. Index
  `UserInteraction` already covers (userId, type, createdAt, target).
- **Retention / DPDP:** raw interaction logs need a TTL (data minimization). Handled by the
  retention-purge work (see PR for `feat/dpdp-retention`). Personalization is a named
  purpose in the Privacy Policy; cascade-on-delete already covered.
- **Cold start + fallback:** every personalized surface degrades gracefully to popularity /
  onboarding prefs.
- **Transparency:** "Why am I seeing this?" affordance on recommended items (trust + DPDP
  explainability).
- **Measurement:** instrument rec CTR, feed dwell, D1/D7 retention — personalization is only
  worth it if these move. Build the dashboard query early.

## Sequencing recommendation

1. Wire the **retention nudge → `pickRetentionPitch`** (v1 payoff, already built — one wire).
2. **Phase 1** taste profile + finish instrumentation.
3. **Phase 2** James grounding first (cheapest, most visible), then content rails.
4. **Phase 3** For-You feed.
5. Phases 4–5 only once data + metrics justify the infra.
