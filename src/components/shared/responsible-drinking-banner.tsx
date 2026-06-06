import { RESPONSIBLE_DRINKING_MESSAGE } from "@/lib/constants";

export function ResponsibleDrinkingBanner() {
  return (
    <div className="border-t border-border/30 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
      {RESPONSIBLE_DRINKING_MESSAGE}
    </div>
  );
}
