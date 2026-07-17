import Skeleton from '@/components/ui/Skeleton'

export default function GetStartedLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-9 w-40" as="h1" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Steps skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
