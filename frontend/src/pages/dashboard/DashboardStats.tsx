import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface DashboardStatsProps {
  statsTotal: number;
  statsOpen: number;
  statsInLucru: number;
  statsFinalizate: number;
  statsCritical: number;
  statsLoading: boolean;
}

export function DashboardStats({
  statsTotal,
  statsOpen,
  statsInLucru,
  statsFinalizate,
  statsCritical,
  statsLoading,
}: DashboardStatsProps) {
 const { t } = useLanguage();
const stats = [
    { value: statsTotal, label: t('dashboard.stats.total'), color: 'var(--violet-500)', highlight: false },
    { value: statsOpen, label: t('dashboard.stats.open'), color: 'var(--signal-500)', highlight: false },
    { value: statsInLucru, label: t('dashboard.stats.inProgress'), color: '#d97706', highlight: false },
    { value: statsFinalizate, label: t('dashboard.stats.completed'), color: '#16a34a', highlight: false },
    { value: statsCritical, label: t('dashboard.stats.critical'), color: '#dc2626', highlight: true },
  ];

return (
    <div className="db-stats" style={{ flexShrink: 0 }}>
      {stats.map(s => (
        <div key={s.label} className={`db-stat-card${s.highlight ? ' db-stat-card--critical' : ''}`}>
          <div className="db-stat-accent" style={{ '--accent': s.color } as React.CSSProperties} />
          <div className="db-stat-value">{statsLoading ? '—' : s.value}</div>
          <div className="db-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}