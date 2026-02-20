import React from 'react';

interface ScrollToBottomProps {
  isDarkMode?: boolean;
  hasMessages: boolean;
  onScrollToBottom: () => void;
}

const ScrollToBottom: React.FC<ScrollToBottomProps> = ({ isDarkMode = false, hasMessages, onScrollToBottom }) => {
  if (!hasMessages) return null;

  return (
    <button
      onClick={onScrollToBottom}
      style={{
        position: 'fixed',
        bottom: '160px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
        background: isDarkMode ? '#1F2937' : 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 95,
      }}
      title="Scroll to bottom"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  );
};

export default ScrollToBottom;
