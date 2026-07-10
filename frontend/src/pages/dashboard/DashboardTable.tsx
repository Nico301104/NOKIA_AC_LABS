import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { 
  Ticket, 
  PageData, 
  SortField, 
  SortOrder, 
  ChartFilterType 
} from '../Dashboard';

// --- HELPER FUNCTIONS ---
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

// --- MAIN COMPONENT ---
interface DashboardTableProps {
  data: PageData | null;
  loading: boolean;
  sortBy: SortField;
  sortOrder: SortOrder;
  handleSortBy: (field: SortField) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  chartFilter: ChartFilterType;
  setChartFilter: React.Dispatch<React.SetStateAction<ChartFilterType>>;
  setSelectedTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  tableRef: React.RefObject<HTMLDivElement>;
}

export function DashboardTable({
  data, loading, sortBy, sortOrder, handleSortBy,
  page, setPage, chartFilter, setChartFilter,
  setSelectedTicket, tableRef
}: DashboardTableProps) {
  const { t, language } = useLanguage();

  return (
    <>
      <div className="db-table-section" ref={tableRef}>
        <div className="db-table-topbar">
          <span className="db-section-label">{t('dashboard.table.title')}</span>
          
          {chartFilter && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(37,99,235,0.08)', padding: '4px 12px',
              borderRadius: '16px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
              color: 'var(--violet-700)', border: '1px solid rgba(37,99,235,0.2)'
            }}>
              <span>
                {t('dashboard.table.chartFilter')} ({chartFilter.source}): <strong>{chartFilter.value}</strong>
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
                title={t('dashboard.table.clearChartFilter')}
              >
                ×
              </button>
            </div>
          )}
          
          <span className="db-section-count">
            {data ? `${data.total} total · ${t('dashboard.table.page')} ${data.page} ${t('dashboard.table.of')} ${data.pages}` : '—'}
            </span>
        </div>
        <div className="db-table-wrap">
          <div style={{ overflow: 'auto', height: '100%' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
                {t('dashboard.table.loading')}
              </div>
            ) : (
                <table className="db-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.table.headers.ticketNo')}</th>
                    <SortableTh label={t('dashboard.table.headers.status')} field="STATUS" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                    <SortableTh label={t('dashboard.table.headers.priority')} field="PRIORITY" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                    <SortableTh label={t('dashboard.table.headers.company')} field="COMPANY" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                    <th>{t('dashboard.table.headers.project')}</th>
                    <SortableTh label={t('dashboard.table.headers.team')} field="TEAM" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                    <th>{t('dashboard.table.headers.person')}</th>
                    <th>{t('dashboard.table.headers.service')}</th>
                    <th>{t('dashboard.table.headers.description')}</th>
                    <SortableTh label={t('dashboard.table.headers.date')} field="SUBMIT_DATETIME" current={sortBy} order={sortOrder} onClick={handleSortBy} />
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(tItem => {
                    const ss = statusStyle(tItem.Status)
                    const pc = priorityColor(tItem.Priority)
                    return (
                      <tr
                        key={tItem.Ticket_Number}
                        onClick={() => setSelectedTicket(tItem)}
                        className={`db-row--clickable${tItem.Priority === 'Critical' ? ' db-row--critical' : ''}`}
                        title={t('dashboard.table.rowTooltip')}
                      >
                        <td><span className="db-ticket-id">{tItem.Ticket_Number}</span></td>
                        <td><span className="db-badge" style={{ background: ss.bg, color: ss.color }}>{tItem.Status}</span></td>
                        <td>
                          <span className="db-priority">
                            <span className="db-priority-dot" style={{ background: pc, boxShadow: `0 0 6px ${pc}` }} />
                            {tItem.Priority}
                          </span>
                        </td>
                        <td className="db-td-body">{tItem.Company ?? '—'}</td>
                        <td className="db-td-body">{tItem.Project ?? '—'}</td>
                        <td className="db-td-body">{tItem.Team ?? '—'}</td>
                        <td className="db-td-body">{tItem.Assigned_Person ?? '—'}</td>
                        <td><span className="db-service">{tItem.Service ?? '—'}</span></td>
                        <td className="db-td-body" style={{ maxWidth: 200 }} title={tItem.Description ?? ''}>
                          {tItem.Description
                            ? (tItem.Description.length > 40 ? tItem.Description.slice(0, 40) + '…' : tItem.Description)
                            : '—'}
                        </td>
                        <td className="db-td-body">{formatDate(tItem.Submit_Datetime, language)}</td>
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
                {t('dashboard.table.page')} {page} {t('dashboard.table.of')} {totalPages}
            </span>
            <PagBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</PagBtn>
            <PagBtn onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</PagBtn>
            </div>
        )
      })()}
    </>
  )
}