import { useEffect, useState, useCallback } from 'react'
import NavBar from '../components/NavBar'
import api from '../services/api'
import './Dashboard.css'

type SortField = 'Submit_Datetime' | 'Priority' | 'Status'
type SortOrder = 'asc' | 'desc'
type Limit = 10 | 25 | 50

interface Ticket {
  Ticket_Number: string
  Status: string
  Priority: string
  Company: string
  Project: string
  Team: string
  Assigned_Person: string
  Service: string
  Submit_Datetime: string | null
}

interface PageData {
  items: Ticket[]
  total: number
  page: number
  pages: number
}

function statusStyle(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Open:     { bg: 'rgba(14,165,233,0.12)',  color: '#0369a1' },
    Closed:   { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
    Resolved: { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
    Pending:  { bg: 'rgba(234,179,8,0.12)',   color: '#b45309' },
  }
  return map[status] ?? { bg: 'rgba(37,99,235,0.1)', color: 'var(--violet-700)' }
}

function priorityColor(priority: string) {
  const map: Record<string, string> = { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a' }
  return map[priority] ?? 'var(--text-muted)'
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
      {label}{active ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
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
  const [data, setData]         = useState<PageData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [exporting, setExporting] = useState(false)

  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState<Limit>(10)
  const [sortBy, setSortBy]     = useState<SortField>('Submit_Datetime')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const fetchTickets = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/tickets/', { params: { page, limit, sort_by: sortBy, sort_order: sortOrder } })
      .then(r => setData(r.data))
      .catch(() => setError('Nu s-au putut încărca tichetele.'))
      .finally(() => setLoading(false))
  }, [page, limit, sortBy, sortOrder])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleSortBy = (field: SortField) => {
    if (field === sortBy) { setSortOrder(o => o === 'asc' ? 'desc' : 'asc') }
    else { setSortBy(field); setSortOrder('desc') }
    setPage(1)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await api.get('/tickets/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = 'tickets.csv'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch {
      setError('Export eșuat.')
    } finally {
      setExporting(false)
    }
  }

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
              <option value="Submit_Datetime">Sortare: Data</option>
              <option value="Priority">Sortare: Prioritate</option>
              <option value="Status">Sortare: Status</option>
            </select>
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Crescător' : 'Descrescător'}
              style={{ ...ctrlStyle, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: '0.4rem 0.9rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.15em',
                color: '#ffffff',
                background: 'linear-gradient(180deg, var(--violet-400), var(--violet-700))',
                borderRadius: '6px',
                border: 'none',
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
              }}
            >
              {exporting ? 'EXPORT...' : 'EXPORT CSV'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', padding: '0.7rem 1rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* Table */}
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
                      <SortableTh label="STATUS"    field="Status"          current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      <SortableTh label="PRIORITATE" field="Priority"       current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      <th>COMPANIE</th><th>PROIECT</th><th>ECHIPĂ</th><th>PERSOANĂ</th><th>SERVICIU</th>
                      <SortableTh label="DATA"      field="Submit_Datetime" current={sortBy} order={sortOrder} onClick={handleSortBy} />
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
                          <td className="db-td-body">{t.Company}</td>
                          <td className="db-td-body">{t.Project}</td>
                          <td className="db-td-body">{t.Team}</td>
                          <td className="db-td-body">{t.Assigned_Person}</td>
                          <td><span className="db-service">{t.Service}</span></td>
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

        {/* Pagination */}
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexShrink: 0, paddingBottom: '0.25rem' }}>
            <PagBtn onClick={() => setPage(1)}             disabled={page === 1}>«</PagBtn>
            <PagBtn onClick={() => setPage(p => p - 1)}   disabled={page === 1}>‹</PagBtn>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
              {page} / {data.pages}
            </span>
            <PagBtn onClick={() => setPage(p => p + 1)}   disabled={page === data.pages}>›</PagBtn>
            <PagBtn onClick={() => setPage(data.pages)}   disabled={page === data.pages}>»</PagBtn>
          </div>
        )}

      </div>
    </div>
  )
}
