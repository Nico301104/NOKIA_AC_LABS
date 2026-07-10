import { useLanguage } from '../../../context/LanguageContext';
import './ChatGuideModal.css';

export function ChatGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  
  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>
        <div className="guide-header">
          <h3 className="guide-title">{t('chatGuide.title')}</h3>
          <button onClick={onClose} className="guide-close">✕</button>
        </div>

        <div className="guide-important">
          <span style={{ color: '#2563eb', fontWeight: 600 }}>{t('chatGuide.important')} </span>
          {t('chatGuide.importantText')}
        </div>

        {/* Section: Can Do */}
        <div className="guide-section">
          <h4 className="guide-subtitle">{t('chatGuide.canDo')}</h4>
          {t('chatGuide.canDoItems').map((item: string, i: number) => (
            <div key={i} className="guide-item">
              <span style={{ color: '#38bdf8', flexShrink: 0 }}>✓</span>{item}
            </div>
          ))}
        </div>

        {/* Section: Examples */}
        <div className="guide-section">
          <h4 className="guide-subtitle">{t('chatGuide.examples')}</h4>
          {t('chatGuide.exampleItems').map((item: string, i: number) => (
            <div key={i} className="guide-example">{item}</div>
          ))}
        </div>

        {/* Section: Limits */}
        <div className="guide-section">
          <h4 className="guide-subtitle">{t('chatGuide.limits')}</h4>
          {t('chatGuide.limitItems').map((item: string, i: number) => (
            <div key={i} className="guide-item">
              <span style={{ color: '#dc2626', flexShrink: 0 }}>✕</span>{item}
            </div>
          ))}
        </div>

        {/* Section: Tips */}
        <div className="guide-section">
          <h4 className="guide-subtitle">{t('chatGuide.tips')}</h4>
          {t('chatGuide.tipItems').map((item: string, i: number) => (
            <div key={i} className="guide-item">
              <span style={{ color: '#2563eb', flexShrink: 0 }}>→</span>{item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}