import Skeleton from '@/components/ui/Skeleton'

export default function HistoryLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-9 w-32" as="h1" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* History items skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
