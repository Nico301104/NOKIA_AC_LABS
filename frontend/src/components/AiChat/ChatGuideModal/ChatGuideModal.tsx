import './ChatGuideModal.css';

export function ChatGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>
        <div className="guide-header">
          <h3 className="guide-title">Ghid de utilizare</h3>
          <button onClick={onClose} className="guide-close">✕</button>
        </div>

        <div className="guide-important">
          <span style={{ color: '#2563eb', fontWeight: 600 }}>Important: </span>
          Botul răspunde doar la întrebări despre proiectul tău. Întrebările despre alte proiecte sau despre întreaga bază de date nu vor returna rezultate relevante.
        </div>

        <div className="guide-section">
          <h4 className="guide-subtitle">CE POATE FACE BOTUL</h4>
          {[
            'Numărul de tichete după status, prioritate sau echipă',
            'Tichete asignate unei persoane din proiectul tău',
            'Statistici despre rezolvare și SLA',
            'Ultimele tichete deschise sau critice din proiectul tău',
          ].map((item, i) => (
            <div key={i} className="guide-item">
              <span style={{ color: '#38bdf8', flexShrink: 0 }}>✓</span>{item}
            </div>
          ))}
        </div>

        <div className="guide-section">
          <h4 className="guide-subtitle">EXEMPLE DE ÎNTREBĂRI BUNE</h4>
          {[
            'Cate tichete sunt cu prioritate Critical?',
            'Cate tichete nu sunt rezolvate?',
            'Care sunt ultimele 5 tichete deschise?',
            'Cate tichete a rezolvat fiecare echipa?',
            'Care este timpul mediu de rezolvare?',
          ].map((item, i) => (
            <div key={i} className="guide-example">{item}</div>
          ))}
        </div>

        <div className="guide-section">
          <h4 className="guide-subtitle">LIMITE TEHNICE</h4>
          {[
            'Nu poate modifica sau șterge tichete',
            'Nu răspunde la întrebări care nu sunt despre tichete',
            'Răspunsurile depind de datele din baza de date',
            'Întrebările trebuie formulate în limbaj natural, nu SQL',
            'Nu poate accesa date din afara proiectului tău',
          ].map((item, i) => (
            <div key={i} className="guide-item">
              <span style={{ color: '#dc2626', flexShrink: 0 }}>✕</span>{item}
            </div>
          ))}
        </div>

        <div className="guide-section">
          <h4 className="guide-subtitle">SFATURI</h4>
          {[
            'Folosește butonul ✦ pentru întrebări rapide predefinite',
            'Fii specific — "tichete Critical neasignate" e mai bun decât "tichete"',
            'Poți întreba despre perioade de timp: "tichete deschise săptămâna asta"',
          ].map((item, i) => (
            <div key={i} className="guide-item">
              <span style={{ color: '#2563eb', flexShrink: 0 }}>→</span>{item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}