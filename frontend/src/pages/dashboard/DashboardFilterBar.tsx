import React from 'react';
import { STATUS_NAMES } from '../../services/tickets';
import { useLanguage } from '../../context/LanguageContext'; // Adjust path if needed
import type { SortField, SortOrder, Limit, FiltersState } from '../../pages/Dashboard'; // Adjust path if needed

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

interface DashboardFilterBarProps {
  search: string;
  setSearch: (val: string) => void;
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  setPage: (val: React.SetStateAction<number>) => void;
  teams: string[];
  hasFilters: boolean;
  clearFilters: () => void;
  limit: Limit;
  setLimit: (val: Limit) => void;
  sortBy: SortField;
  setSortBy: (val: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: React.Dispatch<React.SetStateAction<SortOrder>>;
  handleExport: (format: 'csv' | 'xlsx') => void;
  exporting: 'csv' | 'xlsx' | null;
}

export function DashboardFilterBar({
  search, setSearch,
  filters, setFilters,
  setPage,
  teams,
  hasFilters, clearFilters,
  limit, setLimit,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  handleExport, exporting
}: DashboardFilterBarProps) {

const { t } = useLanguage();

  return (
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
      <FilterGroup label={t('dashboard.filterbar.labels.search')}>
        <input
          type="text"
          placeholder={t('dashboard.filterbar.placeholders.search')}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ ...filterInputStyle, width: 180 }}
        />
      </FilterGroup>
      
      <FilterGroup label={t('dashboard.filterbar.labels.status')}>
        <select
          value={filters.status.length > 0 ? filters.status[0] : ""}
          onChange={e => { 
            const val = e.target.value;
            setFilters(prev => ({ ...prev, status: val ? [val] : [] })); 
            setPage(1); 
          }}
          style={{ ...filterInputStyle, width: 140 }}
        >
          <option value="">{t('dashboard.filterbar.options.all')}</option>
          {STATUS_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </FilterGroup>

      <FilterGroup label={t('dashboard.filterbar.labels.team')}>
        <select
          value={filters.team.length > 0 ? filters.team[0] : ""}
          onChange={e => { 
            const val = e.target.value;
            setFilters(prev => ({ ...prev, team: val ? [val] : [] })); 
            setPage(1); 
          }}
          style={{ ...filterInputStyle, width: 160 }}
        >
          <option value="">{t('dashboard.filterbar.options.all')}</option>
          {teams.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label={t('dashboard.filterbar.labels.startDate')}>
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

      <FilterGroup label={t('dashboard.filterbar.labels.endDate')}>
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
          ✕ {t('dashboard.filterbar.buttons.reset')}
        </button>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
        <select value={limit} onChange={e => { setLimit(Number(e.target.value) as Limit); setPage(1) }} style={ctrlStyle}>
          <option value={10}>10 / {t('dashboard.filterbar.options.perPage')}</option>
          <option value={25}>25 / {t('dashboard.filterbar.options.perPage')}</option>
          <option value={50}>50 / {t('dashboard.filterbar.options.perPage')}</option>
        </select>

        <select value={sortBy} onChange={e => { setSortBy(e.target.value as SortField); setPage(1) }} style={ctrlStyle}>
          <option value="SUBMIT_DATETIME">{t('dashboard.filterbar.sort.date')}</option>
          <option value="PRIORITY">{t('dashboard.filterbar.sort.priority')}</option>
          <option value="STATUS">{t('dashboard.filterbar.sort.status')}</option>
          <option value="COMPANY">{t('dashboard.filterbar.sort.company')}</option>
          <option value="TEAM">{t('dashboard.filterbar.sort.team')}</option>
        </select>

        <button
          onClick={() => setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC')}
          title={sortOrder === 'ASC' ? t('dashboard.filterbar.tooltips.asc') : t('dashboard.filterbar.tooltips.desc')}
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
          {exporting === 'csv' ? t('dashboard.filterbar.buttons.exporting') : t('dashboard.filterbar.buttons.exportCsv')}
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
         {exporting === 'xlsx' ? t('dashboard.filterbar.buttons.exporting') : t('dashboard.filterbar.buttons.exportXlsx')}
        </button>
      </div>
    </div>
  )
}