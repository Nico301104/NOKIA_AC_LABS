import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import './KPIFilterBar.css';

export interface FiltersState {
  status: string[];
  priority: string[];
  team: string[];
  startDate: string;
  endDate: string;
}

export interface FilterOptions {
  statuses: string[];
  priorities: string[];
  teams: string[];
}

export type MultiFilterName = 'status' | 'priority' | 'team';

interface KPIFilterBarProps {
  filters: FiltersState;
  filterOptions: FilterOptions;
  onToggleFilter: (filterName: MultiFilterName, value: string) => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFilters: () => void;
}

interface MultiSelectDropdownProps {
  label: string;
  filterName: MultiFilterName;
  options: string[];
  selectedValues: string[];
  emptyText: string;
  allText: string;
  onToggleFilter: (filterName: MultiFilterName, value: string) => void;
}

const getDropdownText = (
  selectedValues: string[],
  allText: string
) => {
  if (selectedValues.length === 0) {
    return allText;
  }

  if (selectedValues.length <= 2) {
    return selectedValues.join(', ');
  }

  return `${selectedValues.length} selected`;
};

const MultiSelectDropdown = ({
  label,
  filterName,
  options,
  selectedValues,
  emptyText,
  allText,
  onToggleFilter,
}: MultiSelectDropdownProps) => {
  return (
    <div className="filter-group dropdown-filter-group">
      <label>{label}</label>

      <div className="multi-select-dropdown">
        <button type="button" className="multi-select-button">
          <span className="multi-select-button-text">
            {getDropdownText(selectedValues, allText)}
          </span>
          <span className="multi-select-arrow">▾</span>
        </button>

        <div className="multi-select-menu">
          {options.length > 0 ? (
            options.map((option) => (
              <label key={option} className="multi-select-option">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => onToggleFilter(filterName, option)}
                />
                <span>{option}</span>
              </label>
            ))
          ) : (
            <span className="filter-empty-state">{emptyText}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const KPIFilterBar = ({
  filters,
  filterOptions,
  onToggleFilter,
  onDateChange,
  onClearFilters
}: KPIFilterBarProps) => {
  const { t } = useLanguage();
  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.team.length > 0 ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  return (
    <section className="filter-bar">
      <MultiSelectDropdown
        label={t('dashboard.kpifilter.status')}
        filterName="status"
        options={filterOptions.statuses}
        selectedValues={filters.status}
        allText="All Statuses"
        emptyText="No statuses available"
        onToggleFilter={onToggleFilter}
      />

      <MultiSelectDropdown
        label={t('dashboard.kpifilter.priority')}
        filterName="priority"
        options={filterOptions.priorities}
        selectedValues={filters.priority}
        allText="All Priorities"
        emptyText="No priorities available"
        onToggleFilter={onToggleFilter}
      />

      <MultiSelectDropdown
        label={t('dashboard.kpifilter.team')}
        filterName="team"
        options={filterOptions.teams}
        selectedValues={filters.team}
        allText="All Teams"
        emptyText="No teams available"
        onToggleFilter={onToggleFilter}
      />

      <div className="filter-group date-filter-group">
        <label>{t('dashboard.kpifilter.startDate')}</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={onDateChange}
        />
      </div>

      <div className="filter-group date-filter-group">
        <label>{t('dashboard.kpifilter.endDate')}</label>
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={onDateChange}
          min={filters.startDate || undefined}
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className="clear-filters-action-btn"
          onClick={onClearFilters}
        >
          {t('dashboard.kpifilter.clear')}
        </button>
      )}
    </section>
  );
};