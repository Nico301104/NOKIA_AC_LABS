import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import api from '../services/api'
import './Dashboard.css'

interface Ticket {
  Ticket_Number: string
  Status: string | null
  Priority: string | null
  Company: string | null
  Project: string | null
  Team: string | null
  Assigned_Person: string | null
  Service: string | null
  Submit_Datetime: string | null
}

// Returneaza culoarea de fundal si textul pentru badge-ul de status.
function statusStyle(status: string | null) {
  const map: Record<string, { bg: string; color: string }> = {
    Open:     { bg: 'rgba(14,165,233,0.12)',  color: '#0369a1' },
    Closed:   { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
    Resolved: { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
    Pending:  { bg: 'rgba(234,179,8,0.12)',   color: '#b45309' },
  }
  return (status ? map[status] : undefined) ?? { bg: 'rgba(37,99,235,0.1)', color: 'var(--violet-700)' }
}

// Returneaza culoarea punctului colorat din coloana de prioritate.
function priorityColor(priority: string | null) {
  const map: Record<string, string> = { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a' }
  return (priority ? map[priority] : undefined) ?? 'var(--text-muted)'
}

// Formateaza un timestamp ISO in format romanesc (ZZ.LL.AAAA).
function formatDate(dt: string | null | undefined) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleDateString('ro-RO') } catch { return dt }
}

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // La montare, incarca primele 10 tichete (cele mai recente) pentru preview.
    // Totalul returnat de backend este numarul real de tichete din DB (ex: 500).
    api.get('/tickets/', { params: { page: 1, limit: 10 } })
      .then(r => { setTickets(r.data.items); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [])

  // Statisticile sunt calculate local din cele 10 tichete incarcate,
  // cu exceptia totalului care vine direct din backend (COUNT din DB).
  const open       = tickets.filter(t => t.Status === 'Open').length
  const inLucru    = tickets.filter(t => t.Status === 'Pending' || t.Status === 'In Progress').length
  const finalizate = tickets.filter(t => t.Status === 'Closed' || t.Status === 'Resolved').length
  const critical   = tickets.filter(t => t.Priority === 'Critical').length

  const stats = [
    { value: total,      label: 'TOTAL TICHETE', color: 'var(--violet-500)', highlight: false },
    { value: open,       label: 'DESCHISE',      color: 'var(--signal-500)', highlight: false },
    { value: inLucru,    label: 'ÎN LUCRU',      color: '#d97706',           highlight: false },
    { value: finalizate, label: 'FINALIZATE',    color: '#16a34a',           highlight: false },
    { value: critical,   label: 'CRITICE',       color: '#dc2626',           highlight: true  },
  ]

  return (
    <div className="dashboard">
      <NavBar />
      <div className="db-content">

        {/* Carduri cu statistici sumare */}
        <div className="db-stats">
          {stats.map(s => (
            <div key={s.label} className={`db-stat-card${s.highlight ? ' db-stat-card--critical' : ''}`}>
              <div className="db-stat-accent" style={{ '--accent': s.color } as React.CSSProperties} />
              <div className="db-stat-value">{loading ? '—' : s.value}</div>
              <div className="db-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabel cu cele mai recente 10 tichete */}
        <div className="db-table-section">
          <div className="db-table-topbar">
            <span className="db-section-label">TICHETE RECENTE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {!loading && <span className="db-section-count">{tickets.length} rezultate</span>}
              {/* Buton pentru navigare la pagina completa de tichete */}
              <button
                onClick={() => navigate('/tickets')}
                style={{
                  padding: '0.25rem 0.7rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  letterSpacing: '0.15em',
                  color: 'var(--violet-700)',
                  border: '1px solid rgba(37,99,235,0.25)',
                  borderRadius: '5px',
                  background: 'rgba(37,99,235,0.06)',
                  cursor: 'pointer',
                }}
              >
                TOATE →
              </button>
            </div>
          </div>

          <div className="db-table-wrap">
            <div style={{ overflowY: 'auto', height: '100%' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
                  SE ÎNCARCĂ...
                </div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>TICKET #</th><th>STATUS</th><th>PRIORITATE</th>
                      <th>COMPANIE</th><th>PROIECT</th><th>ECHIPĂ</th>
                      <th>PERSOANĂ</th><th>SERVICIU</th><th>DATA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => {
                      const ss = statusStyle(t.Status)
                      const pc = priorityColor(t.Priority)
                      return (
                        // Randul cu prioritate Critical primeste o clasa speciala pentru highlight vizual.
                        <tr key={t.Ticket_Number} className={t.Priority === 'Critical' ? 'db-row--critical' : ''}>
                          <td><span className="db-ticket-id">{t.Ticket_Number}</span></td>
                          <td><span className="db-badge" style={{ background: ss.bg, color: ss.color }}>{t.Status}</span></td>
                          <td>
                            <span className="db-priority">
                              <span className="db-priority-dot" style={{ background: pc, boxShadow: `0 0 6px ${pc}` }} />
                              {t.Priority}
                            </span>
                          </td>
                          <td className="db-td-body">{t.Company ?? '—'}</td>
                          <td className="db-td-body">{t.Project ?? '—'}</td>
                          <td className="db-td-body">{t.Team ?? '—'}</td>
                          <td className="db-td-body">{t.Assigned_Person ?? '—'}</td>
                          <td><span className="db-service">{t.Service ?? '—'}</span></td>
                          <td className="db-td-body">{formatDate(t.Submit_Datetime)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
