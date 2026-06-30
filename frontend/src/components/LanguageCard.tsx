'use client'

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

interface LanguageCardProps {
  code: string
  name: string
  native: string
  progress: number
  totalEntries: number
  translatedEntries: number
}

export default function LanguageCard({
  code,
  name,
  native,
  progress,
  totalEntries,
  translatedEntries,
}: LanguageCardProps) {
  const colorMap: Record<string, string> = {
    my: '#E95420',
    shn: '#772953',
    mnw: '#0E8420',
    ksw: '#007AA6',
  }

  const color = colorMap[code] || '#E95420'

  return (
    <div className="glass-card-hover p-6 card-lift cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-white">{name}</h3>
          <p className="text-2xl font-myanmar text-white/80">{native}</p>
        </div>
        <div className="w-20 h-20">
          <CircularProgressbar
            value={progress}
            text={`${progress}%`}
            styles={buildStyles({
              textSize: '22px',
              pathColor: color,
              textColor: '#ffffff',
              trailColor: 'rgba(255,255,255,0.1)',
            })}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-white/50">
        <span>{translatedEntries.toLocaleString()} translated</span>
        <span>{totalEntries.toLocaleString()} total</span>
      </div>

      <div className="mt-4 w-full bg-white/10 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
