"use client";

interface TasteProfileChartProps {
  profile: {
    sweetness: number;
    bitterness: number;
    sourness: number;
    smokiness: number;
    spiciness: number;
    fruitiness: number;
    floral: number;
    body: number;
    finish: number;
  };
}

const TASTE_ATTRIBUTES = [
  { key: "sweetness", label: "Sweet" },
  { key: "bitterness", label: "Bitter" },
  { key: "sourness", label: "Sour" },
  { key: "smokiness", label: "Smoky" },
  { key: "spiciness", label: "Spicy" },
  { key: "fruitiness", label: "Fruity" },
  { key: "floral", label: "Floral" },
  { key: "body", label: "Body" },
  { key: "finish", label: "Finish" },
] as const;

export function TasteProfileChart({ profile }: TasteProfileChartProps) {
  return (
    <div className="space-y-2">
      {TASTE_ATTRIBUTES.map(({ key, label }) => {
        const value = profile[key as keyof typeof profile];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 text-xs text-muted-foreground">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(value / 10) * 100}%` }}
              />
            </div>
            <span className="w-6 text-xs text-muted-foreground text-right">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
