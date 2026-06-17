import React, { useState } from 'react';
import './KPICollapsibleDrawer.css';

interface KPICollapsibleDrawerProps {
  children: React.ReactNode;
  labelExpanded?: string;
  labelCollapsed?: string;
  initialExpanded?: boolean;
}

export const KPICollapsibleDrawer = ({
  children,
  labelExpanded = 'Hide Details',
  labelCollapsed = 'Show Details',
  initialExpanded = true,
}: KPICollapsibleDrawerProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

  return (
    <div className="collapsible-drawer-wrapper">
      <div className="collapsible-drawer-control">
        <button 
          type="button" 
          className="drawer-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className={`arrow-indicator ${isExpanded ? 'is-open' : ''}`}>
            ▼
          </span>
          {isExpanded ? labelExpanded : labelCollapsed}
        </button>
      </div>

      <div className={`collapsible-drawer-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
};