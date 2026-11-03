export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-gray-200 dark:bg-gray-700 motion-safe:animate-pulse ${className}`} />;
}

export function EventCardsSkeleton({ count = 6 }: { count?: number }) {
  return <div role="status" aria-label="Loading events" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    <span className="sr-only">Loading events…</span>
    {Array.from({ length: count }, (_, index) => <div key={index} aria-hidden="true" className="h-[336px] space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <Skeleton className="h-[132px] w-full rounded-lg" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-6 h-4 w-1/3" />
    </div>)}
  </div>;
}

export function PageSkeleton({ kind = "detail" }: { kind?: "detail" | "profile" | "form" }) {
  return <div role="status" aria-label="Loading content" className="mx-auto max-w-3xl space-y-6">
    <span className="sr-only">Loading content…</span>
    <div aria-hidden="true" className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <Skeleton className={kind === "profile" ? "size-20 rounded-full" : kind === "form" ? "h-8 w-1/3" : "h-56 w-full rounded-lg"} />
      <Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-1/3" />
      <div className="grid grid-cols-2 gap-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      <Skeleton className="h-24 w-full" />
    </div>
  </div>;
}
