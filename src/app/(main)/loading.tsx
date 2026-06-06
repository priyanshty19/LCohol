export default function Loading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg bg-card/50"
        />
      ))}
    </div>
  );
}
