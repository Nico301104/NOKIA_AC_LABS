export default function Tickets() {
  return (
    <div style={{ height: '100vh', overflow: 'hidden', padding: '2rem', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}>
        Tickets<span style={{ color: 'var(--signal-400)' }}>.</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
        Lista tichetelor + filtre — se construiește în iterațiile următoare.
      </p>
    </div>
  )
}
