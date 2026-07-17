import Skeleton from '@/components/ui/Skeleton'

export default function TranslateLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48" as="h1" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-80 mt-2" />
      </div>

      {/* Step indicator skeleton */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-16" />
            {i < 4 && <Skeleton className="h-px w-8 hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Upload zone skeleton */}
      <div className="glass-card p-8">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-10 w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}
