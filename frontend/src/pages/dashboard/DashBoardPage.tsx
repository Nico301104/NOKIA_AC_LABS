import { useEffect, useRef, useState } from 'react';
import { Header } from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import { KpiDashboard } from '../../components/KPIDashBoard/KPIDashBoard';
import { KPICollapsibleDrawer } from '../../components/KPICollapsibleDrawer/KPICollapsibleDrawer';
import {
  KPIFilterBar,
  type FiltersState,
  type FilterOptions,
  type MultiFilterName
} from '../../components/KPIFilterBar/KPIFilterBar';
import type { Ticket } from '../../types/Ticket';
import './DashBoardPage.css';

export const DashboardPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const dataSectionRef = useRef<HTMLElement | null>(null);

  // NEW: State handling whether the analytics drop-drawer layout is visible
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(true);

  const [filters, setFilters] = useState<FiltersState>({
    status: [],
    priority: [],
    team: [],
    startDate: '',
    endDate: '',
  });

  const [chartSelection, setChartSelection] = useState<{
    key: 'STATUS' | 'PRIORITY' | 'TEAM' | 'CATEGORY_TIER_1' | 'CATEGORY_TIER_2' | 'CATEGORY_TIER_3' | 'SLA_STATUS';
    value: string;
    source: string;
  } | null>(null);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    statuses: [],
    priorities: [],
    teams: [],
  });

  useEffect(() => {
    fetch('http://127.0.0.1:8000/kpi/filters')
      .then((response) => response.json())
      .then((data) => {
        setFilterOptions({
          statuses: data.statuses ?? [],
          priorities: data.priorities ?? [],
          teams: data.teams ?? [],
        });
      })
      .catch((error) => {
        console.error('Error fetching filter options:', error);
      });
  }, []);

  const handleToggleFilter = (filterName: MultiFilterName, value: string) => {
    setFilters((prev) => {
      const currentValues = prev[filterName];

      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...prev, [filterName]: nextValues,
      };
    });

    setChartSelection(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));

    setChartSelection(null);
  };

  const handleClearAllFilters = () => {
    setFilters({
      status: [],
      priority: [],
      team: [],
      startDate: '',
      endDate: '',
    });
    setChartSelection(null);
  };

  useEffect(() => {
    setLoading(true);

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

    fetch(`http://127.0.0.1:8000/kpi/tickets?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {

        // DEBUG LOG 1: What does the raw array item actually contain?
        console.log('--- DEBUG: RAW BACKEND TICKETS ---');
        console.log('Total tickets array size:', data?.length);
        if (data && data.length > 0) {
          console.log('Keys present in first ticket object:', Object.keys(data[0]));
          console.log('Full first ticket content instance:', data[0]);
        } else {
          console.log('WARNING: Backend returned an empty ticket array!');
        }

        setTickets(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching tickets:', error);
        setLoading(false);
      });
  }, [filters]);

  const filteredTickets = chartSelection
    ? tickets.filter((ticket, index) => {
      const ticketValue = ticket[chartSelection.key];

      // DEBUG LOG 2: Log details for the first 3 items to observe evaluation patterns
      if (index < 3) {
        console.log(`--- DEBUG: EVALUATING FILTER ON ROW [${index}] ---`);
        console.log('Selected Target Key:', chartSelection.key);
        console.log('Selected Target Value expected:', `"${chartSelection.value}"`);
        console.log('Actual value read on ticket instance:', `"${ticketValue}"`);
        console.log('Data type discovered:', typeof ticketValue);
        console.log('Match determination result:', ticketValue === chartSelection.value);
      }

      return typeof ticketValue === 'string' && ticketValue === chartSelection.value;
    })
    : tickets;

  useEffect(() => {
    if (chartSelection && dataSectionRef.current) {
      dataSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [chartSelection]);

  return (
    <>
      <Header />
      <main className="dashboard-container">


        <KPICollapsibleDrawer
          labelExpanded="Hide Filters & Analytics"
          labelCollapsed="Show Filters & Analytics"
        >
          <KPIFilterBar
            filters={filters}
            filterOptions={filterOptions}
            onToggleFilter={handleToggleFilter}
            onDateChange={handleDateChange}
            onClearFilters={handleClearAllFilters}
          />
          <section className="analytics-section">
            <KpiDashboard filters={filters} onChartSelection={setChartSelection} />
          </section>
        </KPICollapsibleDrawer>

        {/* Detailed Ticket View */}
        <section className="data-section" ref={dataSectionRef}>
          <div className="data-section-header">
            <h2 className="section-title">Active Incident Tickets</h2>
            {chartSelection && (
              <div className="drilldown-chip">
                <span>
                  Filtered by <strong>{chartSelection.source}</strong>: {chartSelection.value}
                </span>
                <button type="button" onClick={() => setChartSelection(null)}>
                  Clear
                </button>
              </div>
            )}
          </div>
          <p className="result-count">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </p>
          {loading ? (
            <p>Loading telecom data...</p>
          ) : (
            <div className="table-wrapper">
              <table className="nokia-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Service</th>
                    <th>Assigned To</th>
                    <th>Submit Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const statusClass = ticket.STATUS?.toLowerCase().replace(/\s+/g, '-') ?? 'unknown';
                    const isCritical = ticket.PRIORITY === 'Critical';

                    return (
                      <tr
                        key={ticket.TICKET_NUMBER}
                        className={isCritical ? 'row-critical' : undefined}
                      >
                        <td className="ticket-id">{ticket.TICKET_NUMBER}</td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {ticket.STATUS}
                          </span>
                        </td>
                        <td className={isCritical ? 'priority-critical' : undefined}>{ticket.PRIORITY}</td>
                        <td>{ticket.SERVICE}</td>
                        <td>{ticket.ASSIGNED_PERSON}</td>
                        <td className="ticket-date">{new Date(ticket.SUBMIT_DATETIME).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredTickets.length && (
                <p className="empty-state">No tickets found for the selected filters.</p>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
};