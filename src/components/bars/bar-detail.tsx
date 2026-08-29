"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  Star,
  Wine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryCard } from "@/components/catalog/entry-card";
import { Textarea } from "@/components/ui/textarea";
import type { BarDetailData } from "@/lib/bars";
import type { CatalogCocktailEntry } from "@/types/database";

const PRICE_LABELS: Record<string, string> = {
  BUDGET: "₹",
  MID_RANGE: "₹₹",
  PREMIUM: "₹₹₹",
  LUXURY: "₹₹₹₹",
};

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function dateLabel(value: string): string {
  return REVIEW_DATE_FORMATTER.format(new Date(value));
}

function ratingLabel(value: number): string {
  return value.toFixed(1);
}

export function BarDetail({
  bar,
  cocktails,
}: {
  bar: BarDetailData;
  cocktails: CatalogCocktailEntry[];
}) {
  const router = useRouter();
  const [shareLabel, setShareLabel] = useState("Share");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${bar.lat},${bar.lng}`;
  const price = bar.priceRange ? PRICE_LABELS[bar.priceRange] : null;
  const primaryRating = bar.communityRating ?? bar.rating;

  function askJames() {
    window.dispatchEvent(
      new CustomEvent("ask-james", {
        detail: {
          prompt: `I'm looking at ${bar.name} in ${bar.city}. What should I order there, and what kind of night is it good for?`,
        },
      }),
    );
  }

  async function shareBar() {
    const data = {
      title: `${bar.name} · Sip Stories`,
      text: `Take a look at ${bar.name} in ${bar.city}.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        setShareLabel("Link copied");
        window.setTimeout(() => setShareLabel("Share"), 2200);
      }
    } catch {
      // Closing the system share sheet is an intentional no-op.
    }
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setReviewMessage(null);
    setReviewError(null);

    try {
      const response = await fetch(`/api/bars/${encodeURIComponent(bar.slug)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, body: reviewBody.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setReviewError(result.error ?? "Your review could not be saved. Try again.");
        return;
      }

      setReviewBody("");
      setReviewMessage("Your review is on the tab.");
      router.refresh();
    } catch {
      setReviewError("Your review could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/bars"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bars
      </Link>

      <section className="glass-panel-elevated relative overflow-hidden rounded-[28px] border border-border/60 p-5 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>{bar.city}</span>
                <span aria-hidden>·</span>
                <span>{bar.type.toLowerCase()}</span>
                {bar.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[var(--ml-sober)]">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <h1 className="max-w-2xl font-display text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
                {bar.name}
              </h1>
              <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{bar.address ? `${bar.address}, ` : ""}{bar.city}, {bar.state}</span>
              </p>
            </div>

            {bar.description && (
              <p className="max-w-2xl text-sm leading-7 text-foreground/80 sm:text-base">
                {bar.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {primaryRating != null && (
                <Badge variant="drink" className="gap-1 px-2.5 py-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {ratingLabel(primaryRating)}
                  <span className="font-normal opacity-70">
                    {bar.communityRating != null ? "community" : "listing"}
                  </span>
                </Badge>
              )}
              {price && <Badge variant="topic" className="px-2.5 py-1">{price}</Badge>}
              <Badge variant="outline" className="px-2.5 py-1">{bar.type}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                nativeButton={false}
                render={
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="gold"
                className="col-span-2 h-11 min-w-0 sm:min-w-32"
              >
                <Navigation /> Directions
              </Button>
              <Button variant="velvet" className="h-11 min-w-0 sm:min-w-32" onClick={askJames}>
                <MessageCircle /> Ask James
              </Button>
              <Button variant="glass" className="h-11 min-w-0 sm:min-w-28" onClick={shareBar}>
                <Share2 /> {shareLabel}
              </Button>
            </div>
          </div>

          <aside className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Wine className="h-4 w-4" /> Tonight&apos;s pours
            </div>
            {bar.bestsellers.length ? (
              <ol className="mt-4 space-y-3">
                {bar.bestsellers.slice(0, 5).map((drink, index) => (
                  <li key={drink} className="flex items-baseline gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-sm font-medium text-foreground">{drink}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Ask James what suits the room tonight.
              </p>
            )}
          </aside>
        </div>
      </section>

      {cocktails.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">From this bar</p>
              <h2 className="font-display text-2xl font-semibold text-foreground">What they pour</h2>
            </div>
            <Link href="/cocktails" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              All cocktails <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {cocktails.map((cocktail) => (
              <EntryCard key={cocktail.id} entry={cocktail} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="font-display text-xl">Leave a bar note</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Rate the room, then leave the detail you wish someone had told you.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveReview}>
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your rating</legend>
                <div className="mt-2 flex gap-1" aria-label={`${reviewRating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      aria-pressed={value <= reviewRating}
                      onClick={() => setReviewRating(value)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:text-primary"
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  ))}
                </div>
              </fieldset>

              <Textarea
                value={reviewBody}
                onChange={(event) => setReviewBody(event.target.value.slice(0, 2000))}
                placeholder="Music, crowd, service, the order that landed…"
                rows={4}
                aria-label="Your bar note"
              />

              {reviewError && <p role="alert" className="text-sm text-destructive">{reviewError}</p>}
              {reviewMessage && <p role="status" className="text-sm text-[var(--ml-sober)]">{reviewMessage}</p>}

              <Button type="submit" variant="gold" className="h-11 w-full" disabled={saving}>
                {saving ? "Saving…" : "Save bar note"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="font-display text-xl">Notes from the room</CardTitle>
            <p className="text-sm text-muted-foreground">
              {bar.reviews.length
                ? `${bar.reviews.length} recent ${bar.reviews.length === 1 ? "note" : "notes"}`
                : "No notes yet"}
            </p>
          </CardHeader>
          <CardContent>
            {bar.reviews.length ? (
              <ul className="divide-y divide-border/50">
                {bar.reviews.map((review) => {
                  const username = review.author.profile?.username;
                  const name = review.author.profile?.displayName ?? username ?? "A regular";
                  return (
                    <li key={review.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {username ? (
                            <Link href={`/profile/${username}`} className="truncate text-sm font-semibold hover:text-primary hover:underline">
                              {name}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold">{name}</span>
                          )}
                          <time dateTime={review.createdAt} className="ml-2 text-[11px] text-muted-foreground/60">
                            {dateLabel(review.createdAt)}
                          </time>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary" aria-label={`${review.rating} out of 5 stars`}>
                          {"★".repeat(review.rating)}
                        </span>
                      </div>
                      {review.body && <p className="whitespace-pre-line text-sm leading-6 text-foreground/75">{review.body}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-5 text-center">
                <span className="text-3xl" aria-hidden>🥃</span>
                <p className="mt-2 font-display text-base font-semibold">Be the first regular to leave a note.</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  The useful detail beats the perfect review.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
