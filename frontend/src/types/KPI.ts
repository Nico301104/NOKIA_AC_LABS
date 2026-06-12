export interface SimpleKPI {
  label: string;
  /* string permite placeholderul "..." cat timp datele se incarca */
  value: number | string;
  unit?: string;
}

export interface StatusKPI {
  status: string;
  count: number;
}

export interface PriorityKPI {
  priority: string;
  count: number;
}

export interface TeamCountKPI {
  team: string;
  count: number;
}

export interface TeamResolutionKPI {
  team: string;
  average_resolution_time_hours: number;
}

export interface CategoryKPI {
  category: string;
  count: number;
}

export interface DashboardData {
  total_tickets: SimpleKPI;
  avg_res_time: SimpleKPI;
  resolved_tickets: SimpleKPI;
  unresolved_tickets: SimpleKPI;
  overdue_tickets: SimpleKPI;

  tickets_by_status: StatusKPI[];
  tickets_by_priority: PriorityKPI[];
  tickets_per_team: TeamCountKPI[];
  avg_res_time_per_team: TeamResolutionKPI[];

  category_tier_1: CategoryKPI[];
  category_tier_2: CategoryKPI[];
  category_tier_3: CategoryKPI[];

  sla_compliance: {
    label: string;
    value: number;
    unit: string;
    breakdown: {
      in_sla: number;
      out_sla: number;
    };
  };
  sla_intervals: {
    interval: string;
    count: number;
  }[];
}