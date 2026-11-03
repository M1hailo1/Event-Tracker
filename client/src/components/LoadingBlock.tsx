import { Skeleton } from "./Skeleton";

interface LoadingBlockProps {
  label?: string;
  size?: number;
  compact?: boolean;
}

export default function LoadingBlock({
  label = "Loading...",
  size = 32,
  compact = false,
}: LoadingBlockProps) {
  return (
    <div
      role="status" aria-label={label}
      className={`w-full space-y-3 ${
        compact ? "py-6" : "py-12"
      }`}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex items-center gap-3"><div style={{ width: size, height: size }} className="shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 motion-safe:animate-pulse" /><Skeleton className="h-4 w-2/3" /></div>
      <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" />
    </div>
  );
}
