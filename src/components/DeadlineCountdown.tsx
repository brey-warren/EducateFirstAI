import React, { useState, useEffect } from 'react';
import { TranslationKey } from '../translations';

interface Deadline {
  name: string;
  date: Date;
  type: 'federal' | 'state' | 'priority';
  emoji: string;
}

interface DeadlineCountdownProps {
  t: (key: TranslationKey) => string;
}

const DeadlineCountdown: React.FC<DeadlineCountdownProps> = ({ t }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const deadlines: Deadline[] = [
    { name: t('priorityDeadline'), date: new Date('2026-02-28'), type: 'priority', emoji: '🔥' },
    { name: t('californiaDeadline'), date: new Date('2026-03-02'), type: 'state', emoji: '🌴' },
    { name: t('federalDeadline'), date: new Date('2027-06-30'), type: 'federal', emoji: '🏛️' },
  ];

  const getTimeRemaining = (deadline: Date) => {
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, passed: true };
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return { days, passed: false };
  };

  const upcomingDeadlines = deadlines
    .map(d => ({ ...d, ...getTimeRemaining(d.date) }))
    .filter(d => !d.passed)
    .sort((a, b) => a.days - b.days);

  const getUrgencyStyle = (days: number) => {
    if (days <= 14) return { bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', text: '#DC2626', badge: '#DC2626' };
    if (days <= 30) return { bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', text: '#D97706', badge: '#D97706' };
    return { bg: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)', text: '#059669', badge: '#059669' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>📅</span>
        <span style={styles.headerText}>{t('upcomingDeadlines')}</span>
      </div>
      <div style={styles.deadlineGrid}>
        {upcomingDeadlines.map((deadline, index) => {
          const urgency = getUrgencyStyle(deadline.days);
          return (
            <div
              key={index}
              style={{
                ...styles.deadlineCard,
                background: urgency.bg,
              }}
            >
              <div style={styles.cardTop}>
                <span style={styles.emoji}>{deadline.emoji}</span>
                <div
                  style={{
                    ...styles.daysBadge,
                    backgroundColor: urgency.badge,
                  }}
                >
                  {deadline.days} {t('days')}
                </div>
              </div>
              <div style={styles.cardBottom}>
                <span style={{ ...styles.deadlineName, color: urgency.text }}>
                  {deadline.name}
                </span>
                <span style={styles.deadlineDate}>
                  {deadline.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <a
        href="https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        {t('viewAllDeadlines')}
      </a>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '32px',
    width: '100%',
    maxWidth: '700px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  headerIcon: {
    fontSize: '20px',
  },
  headerText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#374151',
  },
  deadlineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  deadlineCard: {
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'transform 0.2s ease',
    cursor: 'default',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: '24px',
  },
  daysBadge: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  cardBottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  deadlineName: {
    fontSize: '14px',
    fontWeight: '600',
  },
  deadlineDate: {
    fontSize: '12px',
    color: '#6B7280',
  },
  link: {
    display: 'block',
    textAlign: 'center',
    marginTop: '12px',
    fontSize: '13px',
    color: '#059669',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

export default DeadlineCountdown;
