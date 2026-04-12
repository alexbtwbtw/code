import { useState } from 'react'
import { useTranslation } from '../i18n/context'
import type { Page } from '../App'
import { STATUSES, CATEGORIES, STATUS_KEY, CAT_KEY, PRIORITY_KEY, PRIORITY_COLOR } from '../constants/projects'
import type { ProjectPriority } from '../constants/projects'
import { useProjectsList } from '../api/projects'

const STATUS_OPTIONS = STATUSES as readonly string[]
const CATEGORY_OPTIONS = CATEGORIES as readonly string[]


function fmtDate(d: string | null) {
  if (!d) return null
  return d.slice(0, 10)
}

interface Props {
  onNavigate: (page: Page) => void
}

export default function SearchProjects({ onNavigate }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [country, setCountry] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'budget' | 'priority'>('relevance')

  const { data: projects, isLoading } = useProjectsList({ search, status, category, country, sortBy })

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>{t('searchTitle')}</h1>
        <p className="search-sub">{projects?.length ?? 0} {projects?.length === 1 ? 'projeto' : 'projetos'}</p>
      </div>

      {/* Filters */}
      <div className="search-filters">
        <div className="search-bar">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-row">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{t('filterStatus')}: {t('filterAll')}</option>
            <option value="planning,active">{t('filterPlanningActive')}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{t(STATUS_KEY[s])}</option>
            ))}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">{t('filterCategory')}: {t('filterAll')}</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{t(CAT_KEY[c] ?? 'catOther')}</option>)}
          </select>
          <input
            type="text"
            placeholder={`${t('filterCountry')}…`}
            value={country}
            onChange={e => setCountry(e.target.value)}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="relevance">{t('sortRelevance')}</option>
            <option value="newest">{t('sortNewest')}</option>
            <option value="budget">{t('sortBudget')}</option>
            <option value="priority">{t('fieldPriority')}</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="muted">{t('loading')}</p>
      ) : !projects?.length ? (
        <div className="empty-state">
          <p>{t('noResults')}</p>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => {
            const start = fmtDate(p.startDate)
            const end = fmtDate(p.endDate)

            return (
              <button
                key={p.id}
                className={`project-card project-card--${p.status}`}
                onClick={() => onNavigate({ view: 'project', id: p.id, name: p.name })}
              >
                <div className="pc-top">
                  <span className="pc-ref">{p.refCode}</span>
                  <span className={`status-pill status-pill--${p.status}`}>
                    {t(STATUS_KEY[p.status] ?? 'statusActive')}
                  </span>
                  {p.priority && (
                    <span className={`priority-badge ${PRIORITY_COLOR[p.priority as ProjectPriority] ?? 'priority--medium'}`}>
                      {t(PRIORITY_KEY[p.priority as ProjectPriority] ?? 'priorityMedium')}
                    </span>
                  )}
                </div>
                <h3 className="pc-name">{p.name}</h3>
                <p className="pc-client">{p.client}</p>
                <div className="pc-location">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="pc-loc-region">{p.macroRegion}</span>
                  {p.macroRegion && p.country && <span className="pc-loc-sep">·</span>}
                  <span className="pc-loc-country">{p.country}</span>
                  {p.place && <><span className="pc-loc-sep">·</span><span className="pc-loc-place">{p.place}</span></>}
                </div>
                {p.projectManager && (
                  <div className="pc-pm">
                    <span className="pc-pm-icon">👤</span>
                    <span>{p.projectManager}</span>
                  </div>
                )}
                <div className="pc-bottom">
                  <span className={`pc-cat pc-cat--${p.category}`}>{t(CAT_KEY[p.category] ?? 'catOther')}</span>
                  <div className="pc-financials">
                    {p.totalHours > 0 && <span className="pc-budget">{p.totalHours}h</span>}
                    {start && <span className="pc-dates">{start} — {end ?? '…'}</span>}
                  </div>
                </div>
                <span className="pc-arrow">&rsaquo;</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
