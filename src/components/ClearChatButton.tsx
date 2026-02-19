import React, { useState } from 'react';
import { TranslationKey } from '../translations';

interface ClearChatButtonProps {
  onClear: () => void;
  disabled: boolean;
  t: (key: TranslationKey) => string;
}

const ClearChatButton: React.FC<ClearChatButtonProps> = ({ onClear, disabled, t }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = () => {
    onClear();
    setShowConfirm(false);
  };

  if (disabled) return null;

  return (
    <div style={styles.container}>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          style={styles.clearButton}
          title="Clear conversation"
        >
          🗑️ {t('clearChat')}
        </button>
      ) : (
        <div style={styles.confirmBox}>
          <span style={styles.confirmText}>{t('deleteConfirm')}</span>
          <div style={styles.confirmButtons}>
            <button onClick={handleClear} style={styles.confirmYes}>
              {t('yesDelete')}
            </button>
            <button onClick={() => setShowConfirm(false)} style={styles.confirmNo}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  clearButton: {
    background: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    color: '#6B7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  confirmBox: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  confirmText: {
    fontSize: '13px',
    color: '#DC2626',
    fontWeight: '500',
  },
  confirmButtons: {
    display: 'flex',
    gap: '8px',
  },
  confirmYes: {
    background: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmNo: {
    background: 'white',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default ClearChatButton;
