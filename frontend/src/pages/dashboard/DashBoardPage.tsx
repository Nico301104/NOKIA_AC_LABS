import { useEffect, useState } from 'react';
import Footer from '../../components/footer/Footer';
import { KpiDashboard } from '../../components/KPIDashBoard/KPIDashBoard';
import { KPICollapsibleDrawer } from '../../components/KPICollapsibleDrawer/KPICollapsibleDrawer';
import {
  KPIFilterBar,
  type FiltersState,
  type FilterOptions,
  type MultiFilterName
} from '../../components/KPIFilterBar/KPIFilterBar';
import './DashBoardPage.css';

export const DashboardPage = () => {
  const [filters, setFilters] = useState<FiltersState>({
    status: [],
    priority: [],
    team: [],
    startDate: '',
    endDate: '',
  });

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
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearAllFilters = () => {
    setFilters({
      status: [],
      priority: [],
      team: [],
      startDate: '',
      endDate: '',
    });
  };

  return (
    <>
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
            <KpiDashboard filters={filters} />
          </section>
        </KPICollapsibleDrawer>
      </main>
      <Footer />
    </>
  );
};
