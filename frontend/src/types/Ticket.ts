export interface Ticket {
    TICKET_NUMBER: string;
    STATUS: string;
    PRIORITY: string;
    COMPANY: string;
    PROJECT: string;
    TEAM: string;
    CATEGORY_TIER_1?: string;
    CATEGORY_TIER_2?: string;
    CATEGORY_TIER_3?: string;
    ASSIGNED_PERSON: string;
    SERVICE: string;
    DESCRIPTION: string;
    SUBMIT_DATETIME: string; // Dates come as strings in JSON
    RESOLVED_DATETIME: string | null;
    SLA_STATUS: 'In SLA' | 'Out of SLA';
    SLA_INTERVAL?: string;
}