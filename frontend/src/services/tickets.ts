import api from './api'

// Maparea numelor de status la ID-uri.
// Ordinea provine din seed-ul bazei de date (STATUS_ID este IDENTITY, deci
// ID-urile sunt deterministe): dummy_data.sql inserează 1..5, iar
// new_status.sql adaugă 6 și 7. Backend-ul cere NewStatusId (int) la
// PATCH /tickets/{nr}/status, dar nu expune un endpoint de listare a
// statusurilor — de aceea sunt fixate aici.
export const STATUS_IDS: Record<string, number> = {
  'Open':        1,
  'In Progress': 2,
  'Resolved':    3,
  'Closed':      4,
  'Pending':     5,
  'Assigned':    6,
  'Create':      7,
}

// Lista de statusuri disponibile în interfață (filtre + schimbare status).
export const STATUS_NAMES = Object.keys(STATUS_IDS)

// Un tichet poate fi preluat (self/admin-assign) doar dacă este 'Open' și
// complet liber — exact regula din procedurile sp_SelfAssignTicket /
// sp_AdminAssignTicket din backend.
export function isAssignable(t: { Status: string | null; Team: string | null; Assigned_Person: string | null }) {
  return t.Status === 'Open' && !t.Team && !t.Assigned_Person
}

// Schimbă statusul unui tichet — PATCH /tickets/{nr}/status
export function changeTicketStatus(ticketNumber: string, newStatusId: number) {
  return api.patch(`/tickets/${encodeURIComponent(ticketNumber)}/status`, {
    NewStatusId: newStatusId,
  })
}

// Auto-asignare (preluare proprie) — POST /tickets/{nr}/self-assign
export function selfAssignTicket(ticketNumber: string, userFullName: string) {
  return api.post(`/tickets/${encodeURIComponent(ticketNumber)}/self-assign`, {
    UserFullName: userFullName,
  })
}

// Asignare de către Team Admin către un coleg de echipă — POST /tickets/{nr}/admin-assign
export function adminAssignTicket(ticketNumber: string, adminFullName: string, targetUserFullName: string) {
  return api.post(`/tickets/${encodeURIComponent(ticketNumber)}/admin-assign`, {
    AdminFullName: adminFullName,
    TargetUserFullName: targetUserFullName,
  })
}

// Extrage mesajul de eroare trimis de backend (FastAPI -> { detail }).
export function extractError(err: unknown, fallback = 'A apărut o eroare.'): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail ?? fallback
}
