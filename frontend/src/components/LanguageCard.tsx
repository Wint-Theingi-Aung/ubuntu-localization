'use client'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { ExternalLink } from 'lucide-react'

interface LanguageCardProps {
  code: string
  name: string
  native: string
  color: string
  progress: number
  totalEntries: number
  translatedEntries: number
}

export default function LanguageCard({
  code, name, native, color, progress, totalEntries, translatedEntries,
}: LanguageCardProps) {
  return (
    <div className="glass-card glass-card-hover p-6 card-lift cursor-pointer group">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-[var(--tx-primary)]">{name}</h3>
          <p className="text-2xl font-myanmar text-[var(--tx-secondary)]">{native}</p>
        </div>
        <div className="w-20 h-20 relative">
          <CircularProgressbar
            value={progress}
            text={`${progress % 1 === 0 ? progress : progress.toFixed(1)}%`}
            styles={buildStyles({
              textSize: '22px',
              pathColor: color,
              textColor: 'var(--tx-primary)',
              trailColor: 'rgba(128,128,128,0.15)',
            })}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-[var(--tx-secondary)]">
        <span>{translatedEntries.toLocaleString('en-US')} translated</span>
        <span>{totalEntries.toLocaleString('en-US')} total</span>
      </div>

      <div className="mt-4 w-full bg-[var(--surface-progress)] rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 text-xs text-[var(--tx-dim)] group-hover:text-[var(--tx-primary)] transition-colors">
        <ExternalLink size={12} />
        <span>View on Launchpad</span>
      </div>
    </div>
  )
}
