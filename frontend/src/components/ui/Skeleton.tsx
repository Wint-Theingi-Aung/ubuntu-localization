interface SkeletonProps {
  className?: string
  /** Render as a specific element (default: div) */
  as?: 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'p'
}

export default function Skeleton({ className = '', as: Tag = 'div' }: SkeletonProps) {
  return (
    <Tag
      className={`animate-pulse rounded-lg bg-[var(--surface-overlay)] ${className}`}
      aria-hidden="true"
    />
  )
}
