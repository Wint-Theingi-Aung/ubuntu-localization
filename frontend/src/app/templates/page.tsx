'use client'

import { useState, useMemo } from 'react'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { ExternalLink, Package, ArrowUpDown, Filter, LayoutGrid, List } from 'lucide-react'
import templatesData from '@/data/templates.json'

const ITEMS_PER_PAGE = 20

const categories = ['All', ...Array.from(new Set(templatesData.packages.map(p => p.category)))].sort()
const priorities = ['All', 'high', 'medium', 'low']

/* 4 target languages — English excluded per spec */
const langLinks = [
  { code: 'my', label: 'MY', name: 'Myanmar' },
  { code: 'shn', label: 'SHN', name: 'Shan' },
  { code: 'mnw', label: 'MNW', name: 'Mon' },
  { code: 'ksw', label: 'KSW', name: 'Karen' },
]

const priorityColors: Record<string, string> = {
  high: 'badge-orange',
  medium: 'badge-yellow',
  low: 'badge-green',
}

function lpUrl(pkgName: string, langCode: string) {
  return `https://translations.launchpad.net/ubuntu/stonking/+source/${pkgName}/+pots/${pkgName}/${langCode}/+translate`
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [priority, setPriority] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'name' | 'entries' | 'priority'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let result = templatesData.packages

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      )
    }

    if (category !== 'All') {
      result = result.filter(p => p.category === category)
    }

    if (priority !== 'All') {
      result = result.filter(p => p.priority === priority)
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'entries') cmp = a.entries - b.entries
      else if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 }
        cmp = (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [search, category, priority, sortBy, sortDir])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const toggleSort = (field: 'name' | 'entries' | 'priority') => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Templates</h1>
          <p className="text-white/50 mt-1">
            Ubuntu packages requiring translation — {templatesData.packages.length} total
          </p>
        </div>
        <a
          href="https://translations.launchpad.net/ubuntu"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          View on Launchpad
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setCurrentPage(1) }}
            placeholder="Search packages by name or description..."
          />
        </div>
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCurrentPage(1) }}
            className="input-field text-sm"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setCurrentPage(1) }}
            className="input-field text-sm"
          >
            {priorities.map(p => (
              <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">
          Showing {paginated.length} of {filtered.length} packages
        </p>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Filter size={12} />
          {category !== 'All' && <span className="badge-blue">{category}</span>}
          {priority !== 'All' && <span className={priorityColors[priority]}>{priority}</span>}
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 hover:text-white/60 transition-colors"
                  >
                    Package
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>Category</th>
                <th>
                  <button
                    onClick={() => toggleSort('priority')}
                    className="flex items-center gap-1 hover:text-white/60 transition-colors"
                  >
                    Priority
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => toggleSort('entries')}
                    className="flex items-center gap-1 hover:text-white/60 transition-colors"
                  >
                    Entries
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>Translate</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <div>
                      <p className="font-medium text-white text-sm">{pkg.name}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{pkg.description}</p>
                    </div>
                  </td>
                  <td>
                    <span className="badge-blue text-[10px]">{pkg.category}</span>
                  </td>
                  <td>
                    <span className={`${priorityColors[pkg.priority]} text-[10px]`}>
                      {pkg.priority}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-white/50">
                    {pkg.entries.toLocaleString()}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {langLinks.map((lang) => (
                        <a
                          key={lang.code}
                          href={lpUrl(pkg.name, lang.code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lp-link"
                          title={`Translate ${pkg.name} to ${lang.name}`}
                        >
                          {lang.label}
                          <ExternalLink size={8} />
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — Card Layout */}
      <div className="md:hidden space-y-3">
        {paginated.map((pkg) => (
          <div key={pkg.id} className="glass-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white text-sm">{pkg.name}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{pkg.description}</p>
              </div>
              <div className="flex gap-1.5">
                <span className="badge-blue text-[10px]">{pkg.category}</span>
                <span className={`${priorityColors[pkg.priority]} text-[10px]`}>
                  {pkg.priority}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-white/40">
                {pkg.entries.toLocaleString()} entries
              </span>
              <div className="flex gap-1.5 lp-links-cell">
                {langLinks.map((lang) => (
                  <a
                    key={lang.code}
                    href={lpUrl(pkg.name, lang.code)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-link"
                    title={`Translate to ${lang.name}`}
                  >
                    {lang.label}
                    <ExternalLink size={8} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Package className="mx-auto text-white/10 mb-4" size={48} />
          <p className="text-white/30 text-lg font-medium">No packages match your filters</p>
          <p className="text-white/20 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
