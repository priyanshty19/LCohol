export default function Loading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="glass-panel-subtle h-32 animate-pulse rounded-xl bg-muted/50"
        />
      ))}
    </div>
  );
}
