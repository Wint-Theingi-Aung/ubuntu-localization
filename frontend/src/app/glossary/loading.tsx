import Skeleton from '@/components/ui/Skeleton'

export default function GlossaryLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-9 w-40" as="h1" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-4 w-32 flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
