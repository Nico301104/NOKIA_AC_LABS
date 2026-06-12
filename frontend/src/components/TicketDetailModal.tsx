import { useState, useEffect } from 'react'
import {
  STATUS_IDS,
  STATUS_NAMES,
  isAssignable,
  changeTicketStatus,
  selfAssignTicket,
  adminAssignTicket,
  extractError,
} from '../services/tickets'
import { getMyTeam, TeamUser } from '../services/users'

// Forma de tichet primită din listă (exact câmpurile întoarse de GetPaginatedTickets).
export interface DetailTicket {
  Ticket_Number: string
  Status: string | null
  Priority: string | null
  Company: string | null
  Project: string | null
  Team: string | null
  Assigned_Person: string | null
  Service: string | null
  Description: string | null
  Submit_Datetime: string | null
}

interface Props {
  ticket: DetailTicket
  currentUser: string
  onClose: () => void
  onDone: () => void
}

function statusStyle(status: string | null) {
  const map: Record<string, { bg: string; color: string }> = {
    Open:          { bg: 'rgba(14,165,233,0.14)',  color: '#0369a1' },
    Closed:        { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
    Resolved:      { bg: 'rgba(34,197,94,0.14)',   color: '#16a34a' },
    Pending:       { bg: 'rgba(234,179,8,0.14)',   color: '#b45309' },
    'In Progress': { bg: 'rgba(37,99,235,0.14)',   color: 'var(--violet-700)' },
    Assigned:      { bg: 'rgba(99,102,241,0.16)',  color: '#4f46e5' },
    Create:        { bg: 'rgba(168,85,247,0.14)',  color: '#9333ea' },
  }
  return (status ? map[status] : undefined) ?? { bg: 'rgba(37,99,235,0.12)', color: 'var(--violet-700)' }
}

function priorityColor(priority: string | null) {
  const map: Record<string, string> = { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a' }
  return (priority ? map[priority] : undefined) ?? 'var(--text-muted)'
}

function formatDateTime(dt: string | null) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleString('ro-RO', { dateStyle: 'long', timeStyle: 'short' }) } catch { return dt }
}

// Un câmp de detaliu (etichetă + valoare) afișat într-un panou.
function Field({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid rgba(37,99,235,0.1)',
      borderRadius: '10px',
      padding: '0.7rem 0.85rem',
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
      borderLeft: accent ? `3px solid ${accent}` : '1px solid rgba(37,99,235,0.1)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.22em', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {value || '—'}
      </span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
  color: 'var(--text-primary)', background: 'var(--bg-elevated)',
  border: '1px solid rgba(37,99,235,0.18)', borderRadius: '7px',
  outline: 'none', width: '100%',
}

function actionBtn(bg: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
    letterSpacing: '0.12em', color: '#fff', background: bg, border: 'none',
    borderRadius: '7px', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1, whiteSpace: 'nowrap',
  }
}

export default function TicketDetailModal({ ticket, currentUser, onClose, onDone }: Props) {
  const [newStatus, setNewStatus] = useState<string>(ticket.Status ?? 'Open')
  const [targetUser, setTargetUser] = useState('')
  const [busy, setBusy] = useState<'status' | 'self' | 'admin' | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showActions, setShowActions] = useState(false)

  // Echipa userului curent + dacă el e Team Admin (din GET /users/my-team).
  const [team, setTeam] = useState<TeamUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    getMyTeam()
      .then(r => {
        const users = r.data.users
        setTeam(users)
        const me = users.find(u => u.FullName === currentUser)
        setIsAdmin(!!me && Boolean(me.IsTeamAdmin))
      })
      .catch(() => { /* dacă eșuează, secțiunea admin rămâne ascunsă */ })
  }, [currentUser])

  // Colegii cărora le putem asigna (din aceeași echipă, fără userul curent).
  const teammates = team.filter(u => u.FullName !== currentUser)

  const assignable = isAssignable(ticket)
  const ss = statusStyle(ticket.Status)
  const pc = priorityColor(ticket.Priority)

  const run = async (kind: 'status' | 'self' | 'admin', fn: () => Promise<unknown>, okText: string) => {
    setBusy(kind)
    setMsg(null)
    try {
      await fn()
      setMsg({ kind: 'ok', text: okText })
      onDone()
    } catch (err) {
      setMsg({ kind: 'err', text: extractError(err) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(11,29,79,0.55)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem', animation: 'ticketOverlayIn 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(760px, 100%)', maxHeight: '92vh', overflowY: 'auto',
          background: 'var(--bg-deep)', borderRadius: '18px',
          border: '1px solid rgba(37,99,235,0.2)',
          boxShadow: '0 30px 80px rgba(11,29,79,0.4)',
          animation: 'ticketModalIn 0.24s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* HEADER cu banner gradient colorat după prioritate */}
        <div className="tdm-header" style={{
          position: 'relative',
          padding: '1.5rem 1.75rem 1.4rem',
          background: `linear-gradient(135deg, ${pc}22, var(--bg-panel) 60%)`,
          borderBottom: '1px solid rgba(37,99,235,0.12)',
        }}>
          {/* bara de accent prioritate */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: pc, boxShadow: `0 0 14px ${pc}` }} />

          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.1rem', right: '1.1rem',
              width: 34, height: 34, borderRadius: '9px',
              border: '1px solid var(--graphite-700)', background: 'var(--bg-panel)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.05rem',
            }}
          >
            ✕
          </button>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.28em', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
            DETALII TICHET
          </div>
          <div className="tdm-title" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {ticket.Ticket_Number}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              padding: '0.4rem 0.9rem', borderRadius: '999px',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
              background: ss.bg, color: ss.color,
            }}>
              {ticket.Status ?? '—'}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.4rem 0.9rem', borderRadius: '999px',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
              background: `${pc}1a`, color: pc,
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: pc, boxShadow: `0 0 8px ${pc}` }} />
              {ticket.Priority ?? '—'}
            </span>
          </div>
        </div>

        {/* CORP */}
        <div className="tdm-body" style={{ padding: '1.4rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Grid câmpuri */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.7rem' }}>
            <Field label="COMPANIE" value={ticket.Company} />
            <Field label="ECHIPĂ" value={ticket.Team} />
            <Field label="PROIECT" value={ticket.Project} />
            <Field label="SERVICIU" value={ticket.Service} />
            <Field label="PERSOANĂ ASIGNATĂ" value={ticket.Assigned_Person} accent={ticket.Assigned_Person ? '#16a34a' : undefined} />
            <Field label="DATA ÎNREGISTRĂRII" value={formatDateTime(ticket.Submit_Datetime)} />
          </div>

          {/* Descriere proeminentă */}
          <div style={{
            background: 'var(--bg-panel)', border: '1px solid rgba(37,99,235,0.1)',
            borderRadius: '12px', padding: '1.1rem 1.2rem',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.24em', color: 'var(--text-muted)', marginBottom: '0.55rem' }}>
              DESCRIERE
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--text-primary)', margin: 0 }}>
              {ticket.Description || 'Fără descriere disponibilă.'}
            </p>
          </div>

          {/* Mesaj feedback acțiune */}
          {msg && (
            <div style={{
              padding: '0.65rem 0.9rem', borderRadius: '9px',
              fontFamily: 'var(--font-mono)', fontSize: '0.74rem',
              background: msg.kind === 'ok' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)',
              border: `1px solid ${msg.kind === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.25)'}`,
              color: msg.kind === 'ok' ? '#16a34a' : '#dc2626',
            }}>
              {msg.text}
            </div>
          )}

          {/* Toggle acțiuni */}
          <button
            onClick={() => setShowActions(s => !s)}
            style={{
              alignSelf: 'flex-start',
              padding: '0.6rem 1.1rem', fontFamily: 'var(--font-mono)', fontSize: '0.66rem', letterSpacing: '0.12em',
              color: '#fff', background: 'linear-gradient(180deg, var(--violet-400), var(--violet-700))',
              border: 'none', borderRadius: '9px', cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(37,99,235,0.3)',
            }}
          >
            {showActions ? '▲ ASCUNDE ACȚIUNI' : '▼ GESTIONEAZĂ TICHET'}
          </button>

          {/* Panou acțiuni */}
          {showActions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', borderTop: '1px dashed rgba(37,99,235,0.2)', paddingTop: '1.1rem' }}>

              {/* Schimbare status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Schimbă status</span>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inputStyle, width: 200 }}>
                    {STATUS_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    disabled={busy !== null}
                    onClick={() => run('status', () => changeTicketStatus(ticket.Ticket_Number, STATUS_IDS[newStatus]), `Status schimbat în „${newStatus}".`)}
                    style={actionBtn('linear-gradient(180deg, var(--violet-400), var(--violet-700))', busy !== null)}
                  >
                    {busy === 'status' ? 'SE APLICĂ...' : 'SCHIMBĂ STATUS'}
                  </button>
                </div>
              </div>

              {/* Preluare proprie */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Preia tichetul</span>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    disabled={busy !== null || !assignable}
                    title={assignable ? '' : 'Disponibil doar pentru tichete „Open" neasignate.'}
                    onClick={() => run('self', () => selfAssignTicket(ticket.Ticket_Number, currentUser), 'Tichet preluat cu succes.')}
                    style={actionBtn('linear-gradient(180deg, #16a34a, #15803d)', busy !== null || !assignable)}
                  >
                    {busy === 'self' ? 'SE PRELUA...' : `PREIA (${currentUser || 'eu'})`}
                  </button>
                  {!assignable && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                      Doar tichete „Open" neasignate pot fi preluate.
                    </span>
                  )}
                </div>
              </div>

              {/* Asignare admin — afișată doar Team Admin-ilor (detectat din /users/my-team) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  Asignează (Team Admin)
                  {isAdmin && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.15em',
                      padding: '0.15rem 0.45rem', borderRadius: '999px',
                      background: 'rgba(99,102,241,0.16)', color: '#4f46e5',
                    }}>
                      ADMIN
                    </span>
                  )}
                </span>
                {isAdmin ? (
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={targetUser}
                      onChange={e => setTargetUser(e.target.value)}
                      style={{ ...inputStyle, width: 240 }}
                    >
                      <option value="">Alege coleg din echipă...</option>
                      {teammates.map(u => <option key={u.FullName} value={u.FullName}>{u.FullName}</option>)}
                    </select>
                    <button
                      disabled={busy !== null || !assignable || !targetUser.trim()}
                      title={assignable ? '' : 'Disponibil doar pentru tichete „Open" neasignate.'}
                      onClick={() => run('admin', () => adminAssignTicket(ticket.Ticket_Number, currentUser, targetUser.trim()), `Tichet asignat lui ${targetUser.trim()}.`)}
                      style={actionBtn('linear-gradient(180deg, var(--signal-400), var(--signal-700))', busy !== null || !assignable || !targetUser.trim())}
                    >
                      {busy === 'admin' ? 'SE ASIGNEAZĂ...' : 'ASIGNEAZĂ COLEG'}
                    </button>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Nu ai rol de Team Admin{team.length ? ` pe echipa ${team[0].Team}` : ''}. Doar adminii pot asigna tichete colegilor de echipă.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
