"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DrinkCard } from "./drink-card";
import { CategoryIcon } from "./category-icons";
import { StateSelector, useStateSelection } from "./state-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterData {
  categories: {
    id: string;
    name: string;
    slug: string;
    subcategories: { id: string; name: string; slug: string }[];
  }[];
  brands: string[];
}

const SORT_OPTIONS = [
  { value: "name", label: "A → Z" },
  { value: "popular", label: "Most Popular" },
  { value: "price_low", label: "Price: Low → High" },
  { value: "price_high", label: "Price: High → Low" },
  { value: "newest", label: "Newest" },
];

export function DrinksView({
  initialDrinks,
  initialFilters,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialDrinks: { data: any[]; hasMore: boolean; nextCursor?: string };
  initialFilters: FilterData;
}) {
  // Seeded from the server render — no mount fetch (filters + first page).
  const [drinks, setDrinks] = useState<any[]>(initialDrinks.data);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterData | null>(initialFilters);
  const [hasMore, setHasMore] = useState(initialDrinks.hasMore);
  const [cursor, setCursor] = useState<string | undefined>(initialDrinks.nextCursor);
  const [totalShown, setTotalShown] = useState(initialDrinks.data.length);
  const { stateCode, setStateCode, loaded } = useStateSelection();

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [sort, setSort] = useState("name");
  const [searchDebounced, setSearchDebounced] = useState("");
  // StrictMode-safe mount guard (see cocktails-view): skip while unchanged.
  const initialSig = useRef(`${sort}|${category}|${brand}|${searchDebounced}`);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDrinks = useCallback(
    async (loadMore = false) => {
      setLoading(true);
      const params = new URLSearchParams({ sort });
      if (category !== "all") params.set("category", category);
      if (brand !== "all") params.set("brand", brand);
      if (searchDebounced) params.set("search", searchDebounced);
      if (loadMore && cursor) params.set("cursor", cursor);

      try {
        const res = await fetch(`/api/drinks?${params}`);
        const json = await res.json();
        if (loadMore) {
          setDrinks((prev) => [...prev, ...json.data]);
          setTotalShown((prev) => prev + json.data.length);
        } else {
          setDrinks(json.data);
          setTotalShown(json.data.length);
        }
        setHasMore(json.hasMore);
        setCursor(json.nextCursor);
      } catch (err) {
        console.error("Failed to fetch drinks:", err);
      } finally {
        setLoading(false);
      }
    },
    [sort, category, brand, searchDebounced, cursor]
  );

  // Re-fetch when filters change (skip while unchanged from the server render).
  useEffect(() => {
    const sig = `${sort}|${category}|${brand}|${searchDebounced}`;
    if (sig === initialSig.current) return;
    setCursor(undefined);
    fetchDrinks(false);
  }, [sort, category, brand, searchDebounced]);

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setBrand("all");
    setSort("name");
  }

  const hasActiveFilters =
    search !== "" || category !== "all" || brand !== "all";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-primary text-glow sm:text-3xl">
          Discover Drinks
        </h1>
        <p className="text-sm text-muted-foreground">
          Search across spirits, beers & wines in the Indian market
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <Input
          variant="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drinks, brands, or descriptions..."
          className="h-11 pl-10 text-sm placeholder:text-muted-foreground/50"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category */}
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="glass-panel-subtle h-9 w-[140px] text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {filters?.categories.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug} className="text-xs">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Brand */}
        <Select value={brand} onValueChange={(v) => setBrand(v ?? "all")}>
          <SelectTrigger className="glass-panel-subtle h-9 w-[180px] text-xs">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All Brands</SelectItem>
            {filters?.brands.map((b) => (
              <SelectItem key={b} value={b} className="text-xs">
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v ?? "name")}>
          <SelectTrigger className="glass-panel-subtle h-9 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* State pricing */}
        {loaded && (
          <div className="ml-auto">
            <StateSelector value={stateCode} onChange={setStateCode} />
          </div>
        )}
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {search && (
            <Badge
              variant="drink"
              className="cursor-pointer gap-1 text-xs"
              onClick={() => setSearch("")}
            >
              &quot;{search}&quot; ×
            </Badge>
          )}
          {category !== "all" && (
            <Badge
              variant="drink"
              className="cursor-pointer gap-1 text-xs"
              onClick={() => setCategory("all")}
            >
              {filters?.categories.find((c) => c.slug === category)?.name ??
                category}{" "}
              ×
            </Badge>
          )}
          {brand !== "all" && (
            <Badge
              variant="drink"
              className="cursor-pointer gap-1 text-xs"
              onClick={() => setBrand("all")}
            >
              {brand} ×
            </Badge>
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {loading && drinks.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : drinks.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-xl py-20 text-center">
          <CategoryIcon className="h-14 w-14 text-muted-foreground/40" />
          <p className="mt-3 font-display text-lg font-medium">No drinks found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters or search term"
              : "The drink database is being built"}
          </p>
          {hasActiveFilters && (
            <Button
              variant="glass"
              size="sm"
              className="mt-4"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Result count */}
          <p className="text-xs text-muted-foreground">
            Showing {totalShown} drink{totalShown !== 1 ? "s" : ""}
            {hasMore ? "+" : ""}
          </p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {drinks.map((drink) => (
              <DrinkCard
                key={drink.id}
                drink={drink}
                stateCode={stateCode}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="glass"
                onClick={() => fetchDrinks(true)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
