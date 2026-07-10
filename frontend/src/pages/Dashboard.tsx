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
import { useLanguage } from '../context/LanguageContext';
import { DashboardStats} from './dashboard/DashboardStats';
import { DashboardFilterBar } from './dashboard/DashboardFilterBar';
import { DashboardTable } from './dashboard/DashboardTable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type SortField = 'SUBMIT_DATETIME' | 'STATUS' | 'PRIORITY' | 'COMPANY' | 'TEAM'
export type SortOrder = 'ASC' | 'DESC'
export type Limit = 10 | 25 | 50
export type ChartFilterType = {
  key: 'STATUS' | 'PRIORITY' | 'TEAM' | 'CATEGORY_TIER_1' | 'CATEGORY_TIER_2' | 'CATEGORY_TIER_3' | 'SLA_STATUS' | 'SLA_INTERVAL';
  value: string;
  source: string;
} | null;

export interface Ticket {
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

export interface PageData {
  items: Ticket[]
  total: number
  page: number
  pages: number
}

export interface FiltersState {
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

  const { t } = useLanguage();

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

  return (
    <>
      <div className="dashboard">
        <div className="db-content">

          {/* Carduri statistici */}
          <DashboardStats 
          statsTotal={statsTotal}
          statsOpen={statsOpen}
          statsInLucru={statsInLucru}
          statsFinalizate={statsFinalizate}
          statsCritical={statsCritical}
          statsLoading={statsLoading}
          />

          <KPICollapsibleDrawer
            labelExpanded={t('dashboard.kpicollapsible.hideGraphics')}
            labelCollapsed={t('dashboard.kpicollapsible.showGraphics')}
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
          <DashboardFilterBar 
          search={search}
          setSearch={setSearch}
          filters={filters}
          setFilters={setFilters}
          setPage={setPage}
          teams={teams}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
          limit={limit}
          setLimit={setLimit}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          handleExport={handleExport}
          exporting={exporting}
        />

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', padding: '0.7rem 1rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
            {error}
          </div>
        )}

          {/* Tabel */}
          <DashboardTable 
          data={data}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          handleSortBy={handleSortBy}
          page={page}
          setPage={setPage}
          chartFilter={chartFilter}
          setChartFilter={setChartFilter}
          setSelectedTicket={setSelectedTicket}
          tableRef={tableRef}
        />

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