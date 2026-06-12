import { useEffect, useState } from 'react';
import type { DashboardData } from '../../types/KPI';
import KPICard from './KPICard/KPICard.tsx';
import KPIDonutChart from './KPIDonutChart/KPIDonutChart.tsx';
import KPIBarChart from './KPIBarChart/KPIBarChart.tsx';
import './KPIDashBoard.css';

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

    fetch(`http://127.0.0.1:8000/kpi/dashboard?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
      })
      .catch(err => {
        console.error("Failed to fetch KPIs:", err);
      });
  }, [filters]);

  // REMOVED: Early return clause that was unmounting the whole component tree

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
            {tab === 'all' ? 'All Metrics' : tab === 'sla' ? 'SLA Compliance' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        {/* Tab 1: Overview */}
        {(activeTab === 'all' || activeTab === 'overview') && (
          <div className="dashboard-section">
            {activeTab === 'all' && <h3 className="section-divider-title">Core Performance Metrics</h3>}
            <div className="stat-cards-grid">
              <KPICard kpi={data?.total_tickets ?? { label: "Total Tickets", value: "...", unit: "" }} />
              <KPICard kpi={data?.avg_res_time ?? { label: "Avg Resolution Time", value: "...", unit: "" }} />
              <KPICard kpi={data?.unresolved_tickets ?? { label: "Unresolved Tickets", value: "...", unit: "" }} />
              <KPICard kpi={data?.resolved_tickets ?? { label: "Resolved Tickets", value: "...", unit: "" }} />
              <KPICard kpi={data?.overdue_tickets ?? { label: "Overdue Tickets", value: "...", unit: "" }} />
            </div>
            <div className="charts-layout-grid">
              <KPIDonutChart
                title="Tickets by Status"
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
                title="Tickets by Priority"
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
            {activeTab === 'all' && <h3 className="section-divider-title">SLA Compliance & Targets</h3>}
            <div className="stat-cards-grid">
              <KPICard kpi={data?.sla_compliance ?? { label: "SLA Compliance", value: "...", unit: "%" }} />
              <KPICard kpi={{
                label: "Tickets in SLA",
                value: data?.sla_compliance?.breakdown?.in_sla ?? "...",
                unit: ""
              }} />
              <KPICard kpi={{
                label: "Tickets Breached",
                value: data?.sla_compliance?.breakdown?.out_sla ?? "...",
                unit: ""
              }} />
            </div>

            <div className="charts-layout-grid">
              <KPIDonutChart
                title="SLA Status Breakdown"
                data={data ? [
                  { label: 'In SLA', value: data.sla_compliance.breakdown.in_sla },
                  { label: 'Out of SLA', value: data.sla_compliance.breakdown.out_sla }
                ] : []}
                nameKey="label"
                dataKey="value"
                customColors={['#16a34a', '#dc2626']}
                // ADDED: Callback engine targets the new 'SLA_STATUS' key
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'SLA_STATUS',
                      value: item.label, // Returns either 'In SLA' or 'Out of SLA'
                      source: 'SLA Status Breakdown',
                    });
                  }
                }}
              />
              <KPIBarChart
                title="Resolution Time Distribution"
                data={data?.sla_intervals ?? []}
                xKey="interval"
                yKey="count"
                // ADDED: Callback drill-down connector triggers on click
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'SLA_INTERVAL',
                      value: item.interval, // Automatically extracts context like "Sub 2h" or "2h - 4h"
                      source: 'Resolution Time Distribution',
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
            {activeTab === 'all' && <h3 className="section-divider-title">Categorization Breakdown</h3>}
            <div className="charts-layout-grid tier-charts">
              <KPIDonutChart
                title="Category Tier 1"
                data={data?.category_tier_1 ?? []}
                nameKey="category"
                dataKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'CATEGORY_TIER_1',
                      value: item.category,
                      source: 'Category Tier 1',
                    });
                  }
                }}
              />
              <KPIBarChart
                title="Category Tier 2 (Top 10)"
                data={topCategoryTier2}
                xKey="category"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'CATEGORY_TIER_2',
                      value: item.category,
                      source: 'Category Tier 2',
                    });
                  }
                }}
              />
              <KPIBarChart
                title="Category Tier 3 (Top 10)"
                data={topCategoryTier3}
                xKey="category"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'CATEGORY_TIER_3',
                      value: item.category,
                      source: 'Category Tier 3',
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
            {activeTab === 'all' && <h3 className="section-divider-title">Operational Team Performance</h3>}
            <div className="charts-layout-grid">
              <KPIBarChart
                title="Tickets per Team"
                data={data?.tickets_per_team ?? []}
                xKey="team"
                yKey="count"
                onItemClick={(item) => {
                  if (onChartSelection) {
                    onChartSelection({
                      key: 'TEAM',
                      value: item.team,
                      source: 'Tickets per Team',
                    });
                  }
                }}
              />
              <KPIBarChart title="Avg Resolution Time per Team" data={data?.avg_res_time_per_team ?? []} xKey="team" yKey="average_resolution_time_hours" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};