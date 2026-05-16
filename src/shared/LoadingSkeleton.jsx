function LoadingSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className="ep-skeleton h-9 flex-1"
              style={{ animationDelay: `${(i * 0.05) + (j * 0.02)}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ height = 120 }) {
  return <div className="ep-skeleton w-full" style={{ height }} />;
}

export default LoadingSkeleton;