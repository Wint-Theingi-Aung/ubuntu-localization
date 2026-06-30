'use client'

import { useState, useEffect } from 'react'
import SearchInput from '@/components/SearchInput'
import { Users, ExternalLink, Star, GitCommit, Github, Award, Globe } from 'lucide-react'

interface Contributor {
  login: string
  avatar_url: string
  contributions: number
  html_url: string
}

const LANGUAGES = [
  { name: 'Myanmar', code: 'my', color: 'badge-orange' },
  { name: 'Shan', code: 'shn', color: 'badge-purple' },
  { name: 'Mon', code: 'mnw', color: 'badge-green' },
  { name: "S'gaw Karen", code: 'ksw', color: 'badge-blue' },
]

export default function ContributorsPage() {
  const [search, setSearch] = useState('')
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('https://api.github.com/repos/Wint-Theingi-Aung/ubuntu-localization/contributors?per_page=30')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setContributors(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = contributors.filter(c =>
    !search || c.login.toLowerCase().includes(search.toLowerCase())
  )

  const totalContributions = contributors.reduce((s, c) => s + c.contributions, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Contributors</h1>
        <p className="text-white/50 mt-1">
          People making Ubuntu accessible in indigenous languages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-ubuntu-orange/10 flex items-center justify-center mx-auto mb-2">
            <Users className="text-ubuntu-orange" size={24} />
          </div>
          <p className="text-3xl font-bold text-ubuntu-orange">{contributors.length || '—'}</p>
          <p className="text-xs text-white/40 mt-1">Contributors</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <Globe className="text-emerald-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-emerald-400">4</p>
          <p className="text-xs text-white/40 mt-1">Languages</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
            <GitCommit className="text-purple-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-purple-400">{totalContributions || '—'}</p>
          <p className="text-xs text-white/40 mt-1">Total Commits</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
            <Star className="text-blue-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-blue-400">14</p>
          <p className="text-xs text-white/40 mt-1">GitHub Stars</p>
        </div>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search contributors by username..."
      />

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-ubuntu-orange rounded-full animate-spin" />
          <p className="text-white/40 mt-3 text-sm">Loading from GitHub...</p>
        </div>
      )}

      {/* Contributor Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contributor, idx) => (
            <div
              key={contributor.login}
              className="contributor-card"
            >
              <div className="flex items-start gap-4">
                <img
                  src={contributor.avatar_url}
                  alt={contributor.login}
                  width={56}
                  height={56}
                  className="contributor-avatar"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">
                      {contributor.login}
                    </h3>
                    {idx === 0 && (
                      <Award className="text-amber-400 flex-shrink-0" size={16} />
                    )}
                    {idx === 1 && (
                      <Star className="text-white/30 flex-shrink-0" size={14} />
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {idx === 0 ? 'Lead Contributor' : idx < 3 ? 'Core Contributor' : 'Contributor'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <GitCommit size={14} className="text-white/30" />
                  <span className="font-bold text-ubuntu-orange">
                    {contributor.contributions}
                  </span>
                  <span className="text-white/30 text-xs">commits</span>
                </div>
                <a
                  href={contributor.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                  title="View on GitHub"
                >
                  <Github size={16} className="text-white/40" />
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {LANGUAGES.slice(0, idx === 0 ? 4 : idx < 3 ? 3 : 2).map(lang => (
                  <span key={lang.code} className={`${lang.color} text-[10px]`}>{lang.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="mx-auto text-white/10 mb-4" size={48} />
          <p className="text-white/30 text-lg font-medium">No contributors found</p>
          <p className="text-white/20 text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* CTA */}
      <div className="glass-card p-6 text-center">
        <h3 className="font-semibold text-white mb-2">Want to contribute?</h3>
        <p className="text-sm text-white/40 mb-4">
          Help translate Ubuntu into Myanmar, Shan, Mon, or S&apos;gaw Karen
        </p>
        <div className="flex justify-center gap-3">
          <a
            href="https://github.com/Wint-Theingi-Aung/ubuntu-localization"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            <Github size={16} />
            View on GitHub
            <ExternalLink size={14} />
          </a>
          <a
            href="https://translations.launchpad.net/ubuntu"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Globe size={16} />
            Launchpad
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
