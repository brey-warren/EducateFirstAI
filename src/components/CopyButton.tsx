import React, { useState } from 'react';
import { TranslationKey } from '../translations';

interface CopyButtonProps {
  text: string;
  isDarkMode?: boolean;
  t: (key: TranslationKey) => string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, isDarkMode = false, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: copied ? '#10B981' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
        transition: 'all 0.2s ease',
      }}
      title={copied ? t('copied') : t('copy')}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{t('copied')}</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>{t('copy')}</span>
        </>
      )}
    </button>
  );
};

export default CopyButton;
