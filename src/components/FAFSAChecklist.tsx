import React, { useState, useEffect } from 'react';
import { TranslationKey } from '../translations';
import { useTheme } from '../context/ThemeContext';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
}

interface FAFSAChecklistProps {
  t: (key: TranslationKey) => string;
  isOpen: boolean;
  onClose: () => void;
}

const getChecklistItems = (t: (key: TranslationKey) => string): ChecklistItem[] => [
  { id: 'fsaId', label: t('checklistStep1'), description: t('checklistStep1Desc') },
  { id: 'ssn', label: t('checklistStep2'), description: t('checklistStep2Desc') },
  { id: 'taxReturn', label: t('checklistStep3'), description: t('checklistStep3Desc') },
  { id: 'w2Forms', label: t('checklistStep4'), description: t('checklistStep4Desc') },
  { id: 'bankStatements', label: t('checklistStep5'), description: t('checklistStep5Desc') },
  { id: 'investments', label: t('checklistStep6'), description: t('checklistStep6Desc') },
  { id: 'schoolList', label: t('checklistStep7'), description: t('checklistStep7Desc') },
  { id: 'consentIRS', label: t('checklistStep8'), description: t('checklistStep8Desc') },
  { id: 'inviteContributors', label: t('checklistStep9'), description: t('checklistStep9Desc') },
  { id: 'reviewSubmit', label: t('checklistStep10'), description: t('checklistStep10Desc') },
  { id: 'confirmation', label: t('checklistStep11'), description: t('checklistStep11Desc') },
];

const FAFSAChecklist: React.FC<FAFSAChecklistProps> = ({ t, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const checklistItems = getChecklistItems(t);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('fafsaChecklist');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('fafsaChecklist', JSON.stringify([...completed]));
  }, [completed]);

  const toggleItem = (id: string) => {
    setCompleted(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const progress = Math.round((completed.size / checklistItems.length) * 100);

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={{
        ...styles.modal,
        background: isDarkMode ? '#1F2937' : 'white',
      }}>
        <div style={{
          ...styles.header,
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <div>
            <h2 style={{
              ...styles.title,
              color: isDarkMode ? '#34D399' : '#065F46',
            }}>📋 {t('fafsaChecklist')}</h2>
            <p style={{
              ...styles.subtitle,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>{t('trackProgress')}</p>
          </div>
          <button onClick={onClose} style={{
            ...styles.closeButton,
            background: isDarkMode ? '#374151' : '#F3F4F6',
            color: isDarkMode ? '#D1D5DB' : '#6B7280',
          }}>✕</button>
        </div>

        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.progressText}>{progress}% {t('complete')}</span>
        </div>

        <div style={styles.checklistContainer}>
          {checklistItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                ...styles.checklistItem,
                ...(completed.has(item.id) ? styles.checklistItemCompleted : {}),
                background: completed.has(item.id)
                  ? (isDarkMode ? '#064E3B' : '#F0FDF4')
                  : (isDarkMode ? '#374151' : 'white'),
                borderColor: completed.has(item.id)
                  ? (isDarkMode ? '#059669' : '#A7F3D0')
                  : (isDarkMode ? '#4B5563' : '#E5E7EB'),
              }}
              onClick={() => toggleItem(item.id)}
            >
              <div style={styles.checkboxContainer}>
                <div style={{
                  ...styles.checkbox,
                  ...(completed.has(item.id) ? styles.checkboxChecked : {}),
                  borderColor: completed.has(item.id) ? '#10B981' : (isDarkMode ? '#6B7280' : '#D1D5DB'),
                }}>
                  {completed.has(item.id) && '✓'}
                </div>
                <span style={styles.stepNumber}>{index + 1}</span>
              </div>
              <div style={styles.itemContent}>
                <span style={{
                  ...styles.itemLabel,
                  ...(completed.has(item.id) ? styles.itemLabelCompleted : {}),
                  color: completed.has(item.id)
                    ? (isDarkMode ? '#9CA3AF' : '#6B7280')
                    : (isDarkMode ? '#F3F4F6' : '#1F2937'),
                }}>
                  {item.label}
                </span>
                <span style={{
                  ...styles.itemDescription,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {item.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          ...styles.footer,
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <button onClick={() => setCompleted(new Set())} style={{
            ...styles.resetButton,
            background: isDarkMode ? '#374151' : 'transparent',
            borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
            color: isDarkMode ? '#D1D5DB' : '#6B7280',
          }}>
            🔄 {t('resetProgress')}
          </button>
        </div>
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 300,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 301,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 24px 16px',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#065F46',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0',
  },
  closeButton: {
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#6B7280',
  },
  progressContainer: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    background: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#059669',
    minWidth: '90px',
  },
  checklistContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 24px',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '14px',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
    border: '1px solid #E5E7EB',
  },
  checklistItemCompleted: {
    background: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  checkboxContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  checkbox: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '2px solid #D1D5DB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    transition: 'all 0.2s ease',
  },
  checkboxChecked: {
    background: '#10B981',
    borderColor: '#10B981',
  },
  stepNumber: {
    fontSize: '10px',
    color: '#9CA3AF',
    fontWeight: '500',
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemLabel: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1F2937',
  },
  itemLabelCompleted: {
    textDecoration: 'line-through',
    color: '#6B7280',
  },
  itemDescription: {
    fontSize: '13px',
    color: '#6B7280',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #E5E7EB',
  },
  resetButton: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    color: '#6B7280',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default FAFSAChecklist;
