"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DrinkResult {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  category?: { name: string };
}

interface DrinkTagSelectorProps {
  selected: DrinkResult[];
  onChange: (drinks: DrinkResult[]) => void;
}

export function DrinkTagSelector({ selected, onChange }: DrinkTagSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrinkResult[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/drinks/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        setResults(
          json.data.filter(
            (d: DrinkResult) => !selected.some((s) => s.id === d.id)
          )
        );
        setOpen(true);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, selected]);

  function addDrink(drink: DrinkResult) {
    onChange([...selected, drink]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeDrink(id: string) {
    onChange(selected.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((drink) => (
            <Badge
              key={drink.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {drink.name}
              <button
                type="button"
                onClick={() => removeDrink(drink.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-background/50"
              >
                x
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder="Search drinks to tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />

        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
            {results.map((drink) => (
              <button
                key={drink.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addDrink(drink)}
              >
                <span className="font-medium">{drink.name}</span>
                {drink.brand && (
                  <span className="text-xs text-muted-foreground">
                    {drink.brand}
                  </span>
                )}
                {drink.category && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {drink.category.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
