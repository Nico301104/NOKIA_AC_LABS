import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import TicketDetailModal from '../components/TicketDetailModal'
import { STATUS_NAMES } from '../services/tickets'
import './Dashboard.css'
import Footer from '../components/footer/Footer'
import { KPICollapsibleDrawer } from '../components/KPI/KPICollapsibleDrawer/KPICollapsibleDrawer'
import { KpiDashboard } from '../components/KPI/KPIDashBoard/KPIDashBoard'
import { KPIFilterBar, type MultiFilterName } from '../components/KPI/KPIFilterBar/KPIFilterBar'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type SortField = 'SUBMIT_DATETIME' | 'STATUS' | 'PRIORITY' | 'COMPANY' | 'TEAM'
type SortOrder = 'ASC' | 'DESC'
type Limit = 10 | 25 | 50
type ChartFilterType = {
  key: 'STATUS' | 'PRIORITY' | 'TEAM' | 'CATEGORY_TIER_1' | 'CATEGORY_TIER_2' | 'CATEGORY_TIER_3' | 'SLA_STATUS' | 'SLA_INTERVAL';
  value: string;
  source: string;
} | null;

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

interface FiltersState {
  status: string[];
  priority: string[];
  team: string[];
  startDate: string;
  endDate: string;
}

interface FilterOptions {
  statuses: string[];
  priorities: string[];
  teams: string[];
}

function statusStyle(status: string | null) {
  const map: Record<string, { bg: string; color: string }> = {
    Open: { bg: 'rgba(14,165,233,0.12)', color: '#0369a1' },
    Closed: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
    Resolved: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
    Pending: { bg: 'rgba(234,179,8,0.12)', color: '#b45309' },
    'In Progress': { bg: 'rgba(37,99,235,0.12)', color: 'var(--violet-700)' },
    Assigned: { bg: 'rgba(99,102,241,0.14)', color: '#4f46e5' },
    Create: { bg: 'rgba(168,85,247,0.12)', color: '#9333ea' },
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
  transition: 'border-color 0.15s',
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

export default function Dashboard() {
  const { user } = useAuth()

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const [statsTotal, setStatsTotal] = useState(0)
  const [statsOpen, setStatsOpen] = useState(0)
  const [statsInLucru, setStatsInLucru] = useState(0)
  const [statsFinalizate, setStatsFinalizate] = useState(0)
  const [statsCritical, setStatsCritical] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)

  const tableRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<Limit>(10)
  const [sortBy, setSortBy] = useState<SortField>('SUBMIT_DATETIME')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')

  const [search, setSearch] = useState('')
  const [teams, setTeams] = useState<string[]>([])

  const [chartFilter, setChartFilter] = useState<ChartFilterType>(null);

  // Single source of truth for both KPI visuals and inline Table filters
  const [filters, setFilters] = useState<FiltersState>({
    status: [],
    priority: [],
    team: [],
    startDate: '',
    endDate: '',
  })

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    statuses: [],
    priorities: [],
    teams: [],
  })

  useEffect(() => {
    fetch(`${API_BASE_URL}/kpi/filters`)
      .then((response) => response.json())
      .then((data) => {
        setFilterOptions({
          statuses: data.statuses ?? [],
          priorities: data.priorities ?? [],
          teams: data.teams ?? [],
        })
      })
      .catch((error) => {
        console.error('Error fetching filter options:', error)
      })
  }, [])

  const handleToggleFilter = (filterName: MultiFilterName, value: string) => {
    setFilters((prev) => {
      const currentValues = prev[filterName]
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]

      return {
        ...prev,
        [filterName]: nextValues,
      }
    })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleClearAllFilters = () => {
    setFilters({
      status: [],
      priority: [],
      team: [],
      startDate: '',
      endDate: '',
    })
  }

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true)
      try {
        const [totalRes, openRes, pendingRes, inProgressRes, assignedRes, closedRes, resolvedRes] = await Promise.all([
          api.get('/tickets/', { params: { page: 1, limit: 50 } }),
          api.get('/tickets/', { params: { page: 1, limit: 10, status: 'Open' } }),
          api.get('/tickets/', { params: { page: 1, limit: 10, status: 'Pending' } }),
          api.get('/tickets/', { params: { page: 1, limit: 10, status: 'In Progress' } }),
          api.get('/tickets/', { params: { page: 1, limit: 10, status: 'Assigned' } }),
          api.get('/tickets/', { params: { page: 1, limit: 10, status: 'Closed' } }),
          api.get('/tickets/', { params: { page: 1, limit: 10, status: 'Resolved' } }),
        ])

        const total = totalRes.data.total as number
        const open = openRes.data.total as number
        const pending = pendingRes.data.total as number
        const inProgress = inProgressRes.data.total as number
        const assigned = assignedRes.data.total as number
        const closed = closedRes.data.total as number
        const resolved = resolvedRes.data.total as number
        const pages = totalRes.data.pages as number

        setStatsTotal(total)
        setStatsOpen(open)
        setStatsInLucru(assigned + inProgress + pending)
        setStatsFinalizate(closed + resolved)

        const allItems: Ticket[] = [...totalRes.data.items]
        if (pages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              api.get('/tickets/', { params: { page: i + 2, limit: 50 } })
            )
          )
          remaining.forEach(r => allItems.push(...r.data.items))
        }
        setStatsCritical(allItems.filter(t => t.Priority === 'Critical').length)
      } catch (err) {
        console.error('🔍 [Dashboard] Error fetching global counts stats:', err)
      }  finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    api.get('/tickets/teams')
      .then(r => setTeams(r.data as string[]))
      .catch(() => { })
  }, [])

  const fetchTickets = useCallback(() => {
    setLoading(true)
    setError('')

    const chartParams: Record<string, string> = {}
    if (chartFilter) {
      const paramKeyMap: Record<string, string> = {
        'STATUS': 'status',
        'PRIORITY': 'priority',
        'TEAM': 'team',
        'CATEGORY_TIER_1': 'category_tier_1',
        'CATEGORY_TIER_2': 'category_tier_2',
        'CATEGORY_TIER_3': 'category_tier_3',
        'SLA_STATUS': 'sla_status',
        'SLA_INTERVAL': 'sla_interval'
      };
      
      const apiParam = paramKeyMap[chartFilter.key];
      if (apiParam) {
        chartParams[apiParam] = chartFilter.value;
      }
    }

    // Pull from unified state. If the graphic filter selected multiple, we pick the first one for the API
    const unifiedStatus = filters.status.length > 0 ? filters.status[0] : undefined;
    const unifiedTeam = filters.team.length > 0 ? filters.team[0] : undefined;
    const unifiedPriority = filters.priority.length > 0 ? filters.priority[0] : undefined;

    const finalParams = {
      page, limit,
      sort_by: sortBy,
      sort_order: sortOrder,
      ...(search && { search }),
      status: unifiedStatus,
      team: unifiedTeam,
      priority: unifiedPriority,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
      ...chartParams
    };

    console.log('[Dashboard] fetchTickets execution triggered with parameters:', finalParams);

    api.get('/tickets/', { params: finalParams })
      .then(r => {
        console.log('[Dashboard] API responded successfully. Total items fetched:', r.data?.total);
        setData(r.data);
      })
      .catch(err => {
        console.error('[Dashboard] API error within fetchTickets:', err);
        setError('Nu s-au putut încărca tichetele.');
      })
      .finally(() => setLoading(false))
  }, [page, limit, sortBy, sortOrder, search, chartFilter, filters])

  useEffect(() => { 
    console.log('[Dashboard] useEffect triggered due to hook dependencies modification.');
    fetchTickets(); 
  }, [fetchTickets])

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

      const unifiedStatus = filters.status.length > 0 ? filters.status[0] : undefined;
      const unifiedPriority = filters.priority.length > 0 ? filters.priority[0] : undefined;
      
      const r = await api.get('/tickets/export', {
        params: {
          format,
          sort_by: exportSortBy,
          sort_order: sortOrder.toLowerCase(),
          status: unifiedStatus,
          priority: unifiedPriority,
        },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `tickets.${format}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Dashboard] Export triggered error:', err);
      setError('Export eșuat.')
    } finally {
      setExporting(null)
    }
  }

  const clearFilters = () => {
    console.log('[Dashboard] Manual clear filters operation executed.');
    setSearch(''); 
    setChartFilter(null);
    handleClearAllFilters(); 
    setPage(1);
  }

  const hasFilters = !!(search || chartFilter || filters.team.length || filters.status.length || filters.priority.length || filters.startDate || filters.endDate)

  const stats = [
    { value: statsTotal, label: 'TOTAL TICHETE', color: 'var(--violet-500)', highlight: false },
    { value: statsOpen, label: 'DESCHISE', color: 'var(--signal-500)', highlight: false },
    { value: statsInLucru, label: 'ÎN LUCRU', color: '#d97706', highlight: false },
    { value: statsFinalizate, label: 'FINALIZATE', color: '#16a34a', highlight: false },
    { value: statsCritical, label: 'CRITICE', color: '#dc2626', highlight: true },
  ]

  return (
    <>
      <div className="dashboard">
        <div className="db-content">

          {/* Carduri statistici */}
          <div className="db-stats" style={{ flexShrink: 0 }}>
            {stats.map(s => (
              <div key={s.label} className={`db-stat-card${s.highlight ? ' db-stat-card--critical' : ''}`}>
                <div className="db-stat-accent" style={{ '--accent': s.color } as React.CSSProperties} />
                <div className="db-stat-value">{statsLoading ? '—' : s.value}</div>
                <div className="db-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <KPICollapsibleDrawer
            labelExpanded="Hide KPI Graphics"
            labelCollapsed="Show KPI Graphics"
          >
            <KPIFilterBar
              filters={filters}
              filterOptions={filterOptions}
              onToggleFilter={handleToggleFilter}
              onDateChange={handleDateChange}
              onClearFilters={handleClearAllFilters}
            />
            <section className="analytics-section">
              <KpiDashboard 
                filters={filters} 
                onChartSelection={(selection) => {
                  console.log('[Dashboard] onChartSelection event caught from KpiDashboard. Selection raw payload:', selection);
                  setChartFilter(selection);
                  setPage(1);
                  tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            </section>
          </KPICollapsibleDrawer>

          {/* Bara de filtrare */}
          <div className="db-filterbar" style={{
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
            
            {/* Syncing Table dropdowns directly to unified 'filters' array state */}
            <FilterGroup label="STATUS">
              <select
                value={filters.status.length > 0 ? filters.status[0] : ""}
                onChange={e => { 
                  const val = e.target.value;
                  setFilters(prev => ({ ...prev, status: val ? [val] : [] })); 
                  setPage(1); 
                }}
                style={{ ...filterInputStyle, width: 140 }}
              >
                <option value="">Toate</option>
                {STATUS_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="ECHIPĂ">
              <select
                value={filters.team.length > 0 ? filters.team[0] : ""}
                onChange={e => { 
                  const val = e.target.value;
                  setFilters(prev => ({ ...prev, team: val ? [val] : [] })); 
                  setPage(1); 
                }}
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
                value={filters.startDate}
                onChange={e => { 
                  setFilters(prev => ({ ...prev, startDate: e.target.value })); 
                  setPage(1); 
                }}
                style={{ ...filterInputStyle, width: 140 }}
              />
            </FilterGroup>

            <FilterGroup label="DATĂ FINAL">
              <input
                type="date"
                value={filters.endDate}
                onChange={e => { 
                  setFilters(prev => ({ ...prev, endDate: e.target.value })); 
                  setPage(1); 
                }}
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
                  whiteSpace: 'nowrap',
                }}
              >
                ✕ RESET FILTRE
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
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

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', padding: '0.7rem 1rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
              {error}
            </div>
          )}

          {/* Tabel */}
          <div className="db-table-section" ref={tableRef}>
            <div className="db-table-topbar">
              <span className="db-section-label">LISTA TICHETE</span>
              
              {chartFilter && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(37,99,235,0.08)', padding: '4px 12px',
                  borderRadius: '16px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--violet-700)', border: '1px solid rgba(37,99,235,0.2)'
                }}>
                  <span>
                    Filtru Grafic ({chartFilter.source}): <strong>{chartFilter.value}</strong>
                  </span>
                  <button 
                    onClick={() => { 
                      console.log('[Dashboard] Visual filter badge dismiss clicked.'); 
                      setChartFilter(null); 
                      setPage(1); 
                    }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontWeight: 'bold', color: 'var(--violet-700)', padding: '0 0 0 4px',
                      display: 'flex', alignItems: 'center', fontSize: '1rem'
                    }}
                    title="Șterge filtrul vizual"
                  >
                    ×
                  </button>
                </div>
              )}
              
              <span className="db-section-count">
                {data ? `${data.total} total · pagina ${data.page} din ${data.pages}` : '—'}
              </span>
            </div>
            <div className="db-table-wrap">
              <div style={{ overflow: 'auto', height: '100%' }}>
                {loading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
                    SE ÎNCARCĂ...
                  </div>
                ) : (
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>TICKET #</th>
                        <SortableTh label="STATUS" field="STATUS" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                        <SortableTh label="PRIORITATE" field="PRIORITY" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                        <SortableTh label="COMPANIE" field="COMPANY" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                        <th>PROIECT</th>
                        <SortableTh label="ECHIPĂ" field="TEAM" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                        <th>PERSOANĂ</th>
                        <th>SERVICIU</th>
                        <th>DESCRIERE</th>
                        <SortableTh label="DATA" field="SUBMIT_DATETIME" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                      </tr>
                    </thead>
                    <tbody>
                      {data?.items.map(t => {
                        const ss = statusStyle(t.Status)
                        const pc = priorityColor(t.Priority)
                        return (
                          <tr
                            key={t.Ticket_Number}
                            onClick={() => setSelectedTicket(t)}
                            className={`db-row--clickable${t.Priority === 'Critical' ? ' db-row--critical' : ''}`}
                            title="Click pentru detalii"
                          >
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
                            <td className="db-td-body" style={{ maxWidth: 200 }} title={t.Description ?? ''}>
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
                <PagBtn onClick={() => setPage(1)} disabled={page === 1}>«</PagBtn>
                <PagBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PagBtn>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                  pagina {page} din {totalPages}
                </span>
                <PagBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</PagBtn>
                <PagBtn onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</PagBtn>
              </div>
            )
          })()}

          {/* Pop-up detalii tichet */}
          {selectedTicket && (
            <TicketDetailModal
              ticket={selectedTicket}
              currentUser={user?.username ?? ''}
              onClose={() => setSelectedTicket(null)}
              onDone={fetchTickets}
            />
          )}

        </div>
      </div>

      <Footer />
    </>
  )
}