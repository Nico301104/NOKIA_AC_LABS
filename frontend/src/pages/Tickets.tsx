import { useEffect, useState, useCallback } from 'react'
import NavBar from '../components/NavBar'
import api from '../services/api'
import './Dashboard.css'

type SortField = 'SUBMIT_DATETIME' | 'STATUS' | 'PRIORITY' | 'COMPANY' | 'TEAM'
type SortOrder = 'ASC' | 'DESC'
type Limit = 10 | 25 | 50

interface Ticket {
  Ticket_Number: string
  Status: string | null
  Priority: string | null
  Company: string | null
  Project: string | null
  Team: string | null
  Assigned_Person: string | null
  Service: string | null
  Description: string | null
  Submit_Datetime: string | null
}

interface PageData {
  items: Ticket[]
  total: number
  page: number
  pages: number
}

function statusStyle(status: string | null) {
  const map: Record<string, { bg: string; color: string }> = {
    Open:     { bg: 'rgba(14,165,233,0.12)',  color: '#0369a1' },
    Closed:   { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
    Resolved: { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
    Pending:  { bg: 'rgba(234,179,8,0.12)',   color: '#b45309' },
  }
  return (status ? map[status] : undefined) ?? { bg: 'rgba(37,99,235,0.1)', color: 'var(--violet-700)' }
}

function priorityColor(priority: string | null) {
  const map: Record<string, string> = { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a' }
  return (priority ? map[priority] : undefined) ?? 'var(--text-muted)'
}

function formatDate(dt: string | null | undefined) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleDateString('ro-RO') } catch { return dt }
}

const ctrlStyle: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.62rem',
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
  background: 'var(--bg-panel)',
  border: '1px solid var(--graphite-700)',
  borderRadius: '6px',
  cursor: 'pointer',
  outline: 'none',
}

const filterInputStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.04em',
  color: 'var(--text-primary)',
  background: 'var(--bg-elevated)',
  border: '1px solid rgba(37,99,235,0.15)',
  borderRadius: '7px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const filterLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.52rem',
  letterSpacing: '0.22em',
  color: 'var(--text-muted)',
  marginBottom: '0.3rem',
  display: 'block',
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={filterLabelStyle}>{label}</span>
      {children}
    </div>
  )
}

function SortableTh({ label, field, current, order, onClick }: {
  label: string; field: SortField; current: SortField; order: SortOrder
  onClick: (f: SortField) => void
}) {
  const active = field === current
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', color: active ? 'var(--violet-500)' : undefined }}
      onClick={() => onClick(field)}
    >
      {label}{active ? (order === 'ASC' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

function PagBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 28, height: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
      color: disabled ? 'var(--text-muted)' : 'var(--violet-700)',
      background: disabled ? 'transparent' : 'var(--bg-elevated)',
      border: `1px solid ${disabled ? 'var(--graphite-700)' : 'rgba(37,99,235,0.2)'}`,
      borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      {children}
    </button>
  )
}

export default function Tickets() {
  const [data, setData]           = useState<PageData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)

  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState<Limit>(10)
  const [sortBy, setSortBy]       = useState<SortField>('SUBMIT_DATETIME')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [teamFilter, setTeamFilter]     = useState('')
  const [startDate, setStartDate]       = useState('')
  const [endDate, setEndDate]           = useState('')

  const [teams, setTeams] = useState<string[]>([])

  // Încarcă lista de echipe disponibile din primele 50 de tichete
  useEffect(() => {
    api.get('/tickets/', { params: { page: 1, limit: 50, sort_by: 'TEAM', sort_order: 'ASC' } })
      .then(r => {
        const unique = [...new Set(
          (r.data.items as Ticket[])
            .map(t => t.Team)
            .filter((t): t is string => !!t)
        )].sort()
        setTeams(unique)
      })
      .catch(() => {})
  }, [])

  const fetchTickets = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/tickets/', {
      params: {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(search       && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(teamFilter   && { team: teamFilter }),
        ...(startDate    && { start_date: startDate }),
        ...(endDate      && { end_date: endDate }),
      }
    })
      .then(r => setData(r.data))
      .catch(() => setError('Nu s-au putut încărca tichetele.'))
      .finally(() => setLoading(false))
  }, [page, limit, sortBy, sortOrder, search, statusFilter, teamFilter, startDate, endDate])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleSortBy = (field: SortField) => {
    if (field === sortBy) { setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC') }
    else { setSortBy(field); setSortOrder('DESC') }
    setPage(1)
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format)
    try {
      const exportSortBy = (['SUBMIT_DATETIME', 'PRIORITY', 'STATUS'] as SortField[]).includes(sortBy)
        ? sortBy.toLowerCase()
        : 'submit_datetime'
      const r = await api.get('/tickets/export', {
        params: {
          format,
          sort_by: exportSortBy,
          sort_order: sortOrder.toLowerCase(),
          ...(statusFilter && { status: statusFilter }),
        },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `tickets.${format}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch {
      setError('Export eșuat.')
    } finally {
      setExporting(null)
    }
  }

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setTeamFilter('')
    setStartDate(''); setEndDate(''); setPage(1)
  }

  const hasFilters = !!(search || statusFilter || teamFilter || startDate || endDate)

  return (
    <div className="dashboard">
      <NavBar />
      <div className="db-content">

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tichete<span style={{ color: 'var(--signal-400)' }}>.</span>
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value) as Limit); setPage(1) }} style={ctrlStyle}>
              <option value={10}>10 / pagină</option>
              <option value={25}>25 / pagină</option>
              <option value={50}>50 / pagină</option>
            </select>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value as SortField); setPage(1) }} style={ctrlStyle}>
              <option value="SUBMIT_DATETIME">Sortare: Data</option>
              <option value="PRIORITY">Sortare: Prioritate</option>
              <option value="STATUS">Sortare: Status</option>
              <option value="COMPANY">Sortare: Companie</option>
              <option value="TEAM">Sortare: Echipă</option>
            </select>
            <button
              onClick={() => setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC')}
              title={sortOrder === 'ASC' ? 'Crescător' : 'Descrescător'}
              style={{ ...ctrlStyle, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {sortOrder === 'ASC' ? '↑' : '↓'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              style={{
                padding: '0.4rem 0.9rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.15em',
                color: '#ffffff',
                background: 'linear-gradient(180deg, var(--violet-400), var(--violet-700))',
                borderRadius: '6px',
                border: 'none',
                cursor: exporting !== null ? 'not-allowed' : 'pointer',
                opacity: exporting !== null ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
              }}
            >
              {exporting === 'csv' ? 'EXPORT...' : 'EXPORT CSV'}
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exporting !== null}
              style={{
                padding: '0.4rem 0.9rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.15em',
                color: '#ffffff',
                background: 'linear-gradient(180deg, #16a34a, #15803d)',
                borderRadius: '6px',
                border: 'none',
                cursor: exporting !== null ? 'not-allowed' : 'pointer',
                opacity: exporting !== null ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
              }}
            >
              {exporting === 'xlsx' ? 'EXPORT...' : 'EXPORT XLSX'}
            </button>
          </div>
        </div>

        {/* Bara de filtrare */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end',
          flexShrink: 0,
          flexWrap: 'wrap',
          padding: '0.85rem 1rem',
          background: 'var(--bg-panel)',
          border: '1px solid rgba(37,99,235,0.1)',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(37,99,235,0.05)',
        }}>

          <FilterGroup label="CĂUTARE">
            <input
              type="text"
              placeholder="Nr. tichet, descriere..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ ...filterInputStyle, width: 180 }}
            />
          </FilterGroup>

          <FilterGroup label="STATUS">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{ ...filterInputStyle, width: 140 }}
            >
              <option value="">Toate</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Resolved">Resolved</option>
              <option value="Pending">Pending</option>
            </select>
          </FilterGroup>

          <FilterGroup label="ECHIPĂ">
            <select
              value={teamFilter}
              onChange={e => { setTeamFilter(e.target.value); setPage(1) }}
              style={{ ...filterInputStyle, width: 160 }}
            >
              <option value="">Toate</option>
              {teams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="DATĂ START">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1) }}
              style={{ ...filterInputStyle, width: 140 }}
            />
          </FilterGroup>

          <FilterGroup label="DATĂ FINAL">
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1) }}
              style={{ ...filterInputStyle, width: 140 }}
            />
          </FilterGroup>

          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                alignSelf: 'flex-end',
                padding: '0.45rem 0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                color: '#dc2626',
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.25)',
                borderRadius: '7px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ RESET FILTRE
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', padding: '0.7rem 1rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* Tabelul principal */}
        <div className="db-table-section">
          <div className="db-table-topbar">
            <span className="db-section-label">LISTA TICHETE</span>
            <span className="db-section-count">
              {data ? `${data.total} total · pagina ${data.page} din ${data.pages}` : '—'}
            </span>
          </div>
          <div className="db-table-wrap">
            <div style={{ overflowY: 'auto', height: '100%' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
                  SE ÎNCARCĂ...
                </div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>TICKET #</th>
                      <SortableTh label="STATUS"     field="STATUS"          current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      <SortableTh label="PRIORITATE" field="PRIORITY"        current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      <SortableTh label="COMPANIE"   field="COMPANY"         current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      <th>PROIECT</th>
                      <SortableTh label="ECHIPĂ"     field="TEAM"            current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      <th>PERSOANĂ</th>
                      <th>SERVICIU</th>
                      <th>DESCRIERE</th>
                      <SortableTh label="DATA"       field="SUBMIT_DATETIME" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map(t => {
                      const ss = statusStyle(t.Status)
                      const pc = priorityColor(t.Priority)
                      return (
                        <tr key={t.Ticket_Number} className={t.Priority === 'Critical' ? 'db-row--critical' : ''}>
                          <td><span className="db-ticket-id">{t.Ticket_Number}</span></td>
                          <td><span className="db-badge" style={{ background: ss.bg, color: ss.color }}>{t.Status}</span></td>
                          <td>
                            <span className="db-priority">
                              <span className="db-priority-dot" style={{ background: pc, boxShadow: `0 0 6px ${pc}` }} />
                              {t.Priority}
                            </span>
                          </td>
                          <td className="db-td-body">{t.Company ?? '—'}</td>
                          <td className="db-td-body">{t.Project ?? '—'}</td>
                          <td className="db-td-body">{t.Team ?? '—'}</td>
                          <td className="db-td-body">{t.Assigned_Person ?? '—'}</td>
                          <td><span className="db-service">{t.Service ?? '—'}</span></td>
                          <td
                            className="db-td-body"
                            style={{ maxWidth: 200 }}
                            title={t.Description ?? ''}
                          >
                            {t.Description
                              ? (t.Description.length > 40 ? t.Description.slice(0, 40) + '…' : t.Description)
                              : '—'}
                          </td>
                          <td className="db-td-body">{formatDate(t.Submit_Datetime)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Paginare */}
        {data && (() => {
          const totalPages = data.pages
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexShrink: 0, paddingBottom: '0.25rem' }}>
              <PagBtn onClick={() => setPage(1)}          disabled={page === 1}>«</PagBtn>
              <PagBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PagBtn>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                pagina {page} din {totalPages}
              </span>
              <PagBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</PagBtn>
              <PagBtn onClick={() => setPage(totalPages)}  disabled={page >= totalPages}>»</PagBtn>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
