const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { useEffect, useState } from 'react';
import type { DashboardData } from '../../../types/KPI';
import KPICard from './KPICard/KPICard.tsx';
import KPIDonutChart from './KPIDonutChart/KPIDonutChart.tsx';
import KPIBarChart from './KPIBarChart/KPIBarChart.tsx';
import './KPIDashBoard.css';
import { useLanguage } from '../../../context/LanguageContext.tsx';

interface KpiDashboardProps {
  filters: {
    status: string[];
    priority: string[];
    team: string[];
    assigned_person?: string;
    startDate?: string;
    endDate?: string;
  };

  onChartSelection?: (selection: {
    key: 'STATUS' | 'PRIORITY' | 'TEAM' | 'CATEGORY_TIER_1' | 'CATEGORY_TIER_2' | 'CATEGORY_TIER_3' | 'SLA_STATUS' | 'SLA_INTERVAL';
    value: string;
    source: string;
  } | null) => void;
}

type TabType = 'all' | 'overview' | 'sla' | 'categories' | 'teams';

export const KpiDashboard = ({ filters, onChartSelection }: KpiDashboardProps) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { t } = useLanguage();
  const topCategoryTier2 = (data?.category_tier_2 ?? []).slice(0, 10);
  const topCategoryTier3 = (data?.category_tier_3 ?? []).slice(0, 10);

  useEffect(() => {
    setData(null);

    const params = new URLSearchParams();
    filters.status.forEach((status) => {
      params.append('status', status);
    });

    filters.priority.forEach((priority) => {
      params.append('priority', priority);
    });

    filters.team.forEach((team) => {
      params.append('team', team);
    });

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    fetch(`${API_BASE_URL}/kpi/dashboard?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
      })
      .catch(err => {
        console.error("Failed to fetch KPIs:", err);
      });
  }, [filters]);

  // REMOVED: Early return clause that was unmounting the whole component tree

  const getKpiCols = (count: number) => {
    if (count <= 3) return 1; // 1, 2, or 3 cards -> 1 column, stacked vertically
    if (count === 4) return 2; // 4 cards -> 2x2 grid
    return 3; // 5+ cards -> max 3 columns (e.g. 5 is 3 on top, 2 on bottom)
  };

  return (
    /* We append 'is-loading' when data is null to let CSS smoothly dim/freeze the dashboard sections */
    <div className={`kpi-dashboard-container ${!data ? 'is-loading' : ''}`}>

      {/* Dynamic Global Progress Loading Bar Overlay */}
      {/* {!data && (
        <div className="dashboard-loading-overlay">
          <div className="spinner"></div>
          <span>Updating Analytics...</span>
        </div>
      )} */}

      {/* Tab Navigation reverted to clean standalone layout */}
      <div className="tabs">
      {(['all', 'overview', 'sla', 'categories', 'teams'] as TabType[]).map((tab) => (
        <button
          key={tab}
          className={activeTab === tab ? 'active' : ''}
          onClick={() => setActiveTab(tab)}
        >
          {t(`dashboard.kpidashboard.tabs.${tab}`)}
        </button>
      ))}
    </div>

      <div className="kpi-grid">
        {/* Tab 1: Overview */}
        {(activeTab === 'all' || activeTab === 'overview') && (
          <div className="dashboard-section">
            {activeTab === 'all' && <h3 className="section-divider-title">{t('dashboard.kpidashboard.sections.core')}</h3>}
            
            {/* NEW UNIFIED GRID: KPI Cards and Charts sit side-by-side */}
            <div className="unified-dashboard-grid">
              
              {/* KPI CARD SUB-GRID */}
              {/* We pass the dynamic column count as a CSS variable */}
              <div 
                className="kpi-card-container" 
                style={{ '--kpi-cols': getKpiCols(5) } as React.CSSProperties}
              >
                <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.totalTickets'), value: data?.total_tickets?.value ?? "...", unit: "" }} />
                <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.avgResTime'), value: data?.avg_res_time?.value ?? "...", unit: "" }} />
                <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.unresolved'), value: data?.unresolved_tickets?.value ?? "...", unit: "" }} />
                <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.resolved'), value: data?.resolved_tickets?.value ?? "...", unit: "" }} />
                <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.overdue'), value: data?.overdue_tickets?.value ?? "...", unit: "" }} />
              </div>
              
              <KPIDonutChart
                title={t('dashboard.kpidashboard.charts.ticketsByStatus')}
                data={data?.tickets_by_status ?? []}
                nameKey="status"
                dataKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'STATUS',
                      value: item.status,
                      source: 'Tickets by Status',
                    });
                  }
                }}
              />
              <KPIBarChart
                title={t('dashboard.kpidashboard.charts.ticketsByPriority')}
                data={data?.tickets_by_priority ?? []}
                xKey="priority"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'PRIORITY',
                      value: item.priority,
                      source: 'Tickets by Priority',
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 2: SLA Metrics */}
        {(activeTab === 'all' || activeTab === 'sla') && (
          <div className="dashboard-section">
            {activeTab === 'all' && <h3 className="section-divider-title">{t('dashboard.kpidashboard.sections.sla')}</h3>}
            <div className="unified-dashboard-grid">
              {/* 3 Cards -> Automatically returns 1 column, stacked vertically */}
              <div
                className="kpi-card-container" 
                style={{ '--kpi-cols': getKpiCols(3) } as React.CSSProperties}
              >
              <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.slaCompliance'), value: data?.sla_compliance?.value ?? "...", unit: "%" }} />
              <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.inSla'), value: data?.sla_compliance?.breakdown?.in_sla ?? "...", unit: "" }} />
              <KPICard kpi={{ label: t('dashboard.kpidashboard.metrics.breached'), value: data?.sla_compliance?.breakdown?.out_sla ?? "...", unit: "" }} />
            </div>

              <KPIDonutChart
                title={t('dashboard.kpidashboard.charts.slaStatus')}
                data={data ? [
                  { label: t('dashboard.kpidashboard.metrics.inSla'), value: data.sla_compliance.breakdown.in_sla },
                  { label: t('dashboard.kpidashboard.metrics.breached'), value: data.sla_compliance.breakdown.out_sla }
                ] : []}
                nameKey="label"
                dataKey="value"
                customColors={['#16a34a', '#dc2626']}
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'SLA_STATUS',
                      value: item.label,
                      source: t('dashboard.kpidashboard.charts.slaStatus'),
                    });
                  }
                }}
              />
              <KPIBarChart
                title={t('dashboard.kpidashboard.charts.resTimeDist')}
                data={data?.sla_intervals ?? []}
                xKey="interval"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'SLA_INTERVAL',
                      value: item.interval,
                      source: t('dashboard.kpidashboard.charts.resTimeDist'),
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Categories */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <div className="dashboard-section">
            {activeTab === 'all' && <h3 className="section-divider-title">{t('dashboard.kpidashboard.sections.categorization')}</h3>}
            <div className="charts-layout-grid tier-charts">
              <KPIDonutChart
                title={t('dashboard.kpidashboard.charts.catTier1')}
                data={data?.category_tier_1 ?? []}
                nameKey="category"
                dataKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'CATEGORY_TIER_1',
                      value: item.category,
                      source: t('dashboard.kpidashboard.charts.catTier1'),
                    });
                  }
                }}
              />
              <KPIBarChart
                title={t('dashboard.kpidashboard.charts.catTier2')}
                data={topCategoryTier2}
                xKey="category"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'CATEGORY_TIER_2',
                      value: item.category,
                      source: t('dashboard.kpidashboard.charts.catTier2'),
                    });
                  }
                }}
              />
              <KPIBarChart
                title={t('dashboard.kpidashboard.charts.catTier3')}
                data={topCategoryTier3}
                xKey="category"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'CATEGORY_TIER_3',
                      value: item.category,
                      source: t('dashboard.kpidashboard.charts.catTier3'),
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Teams */}
        {(activeTab === 'all' || activeTab === 'teams') && (
          <div className="dashboard-section">
            {activeTab === 'all' && <h3 className="section-divider-title">{t('dashboard.kpidashboard.sections.teamPerformance')}</h3>}
            <div className="charts-layout-grid">
              <KPIBarChart
                title={t('dashboard.kpidashboard.charts.ticketsPerTeam')}
                data={data?.tickets_per_team ?? []}
                xKey="team"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'TEAM',
                      value: item.team,
                      source: t('dashboard.kpidashboard.charts.ticketsPerTeam'),
                    });
                  }
                }}
              />
              <KPIBarChart
                title={t('dashboard.kpidashboard.charts.avgResTimePerTeam')}
                data={data?.avg_res_time_per_team ?? []}
                xKey="team"
                yKey="average_resolution_time_hours"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};