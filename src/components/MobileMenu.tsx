import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { TranslationKey } from '../translations';

interface MobileMenuProps {
  isGuest: boolean;
  userName: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onShowHistory: () => void;
  onShowChecklist: () => void;
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  t: (key: TranslationKey) => string;
  disabled?: boolean;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const MobileMenu: React.FC<MobileMenuProps> = ({
  isGuest,
  userName,
  onSignIn,
  onSignOut,
  onShowHistory,
  onShowChecklist,
  currentLanguage,
  onLanguageChange,
  t,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="mobile-menu-container">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '10px',
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ width: '18px', height: '2px', background: 'white', borderRadius: '1px' }} />
        <span style={{ width: '18px', height: '2px', background: 'white', borderRadius: '1px' }} />
        <span style={{ width: '18px', height: '2px', background: 'white', borderRadius: '1px' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 400,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: isDarkMode ? '#1F2937' : 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              zIndex: 401,
              minWidth: '220px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            }}
          >
            {/* User Status */}
            <div
              style={{
                padding: '16px',
                borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                background: isDarkMode ? '#374151' : '#F9FAFB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isGuest ? '#6B7280' : '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                  }}
                >
                  {isGuest ? '👤' : userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#F3F4F6' : '#1F2937', fontSize: '14px' }}>
                    {isGuest ? 'Guest' : userName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {isGuest ? t('signInToSave') : t('welcome')}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: '8px 0' }}>
              {/* Chat History */}
              <button
                onClick={() => handleAction(onShowHistory)}
                style={menuItemStyle(isDarkMode)}
              >
                <span style={{ fontSize: '18px' }}>💬</span>
                <span>{t('chatHistory')}</span>
              </button>

              {/* Checklist */}
              <button
                onClick={() => handleAction(onShowChecklist)}
                style={menuItemStyle(isDarkMode)}
              >
                <span style={{ fontSize: '18px' }}>📋</span>
                <span>{t('fafsaChecklist')}</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => handleAction(toggleDarkMode)}
                style={menuItemStyle(isDarkMode)}
              >
                <span style={{ fontSize: '18px' }}>{isDarkMode ? '☀️' : '🌙'}</span>
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* Divider */}
              <div style={{ height: '1px', background: isDarkMode ? '#374151' : '#E5E7EB', margin: '8px 0' }} />

              {/* Language Selection */}
              <div style={{ padding: '8px 16px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                  Language
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => !disabled && handleAction(() => onLanguageChange(lang.code))}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: currentLanguage === lang.code
                          ? '2px solid #10B981'
                          : isDarkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
                        background: currentLanguage === lang.code
                          ? isDarkMode ? '#064E3B' : '#F0FDF4'
                          : 'transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        opacity: disabled ? 0.5 : 1,
                      }}
                      title={disabled ? 'Please wait for response' : lang.name}
                      disabled={disabled}
                    >
                      {lang.flag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: isDarkMode ? '#374151' : '#E5E7EB', margin: '8px 0' }} />

              {/* Sign In / Sign Out */}
              <button
                onClick={() => handleAction(isGuest ? onSignIn : onSignOut)}
                style={{
                  ...menuItemStyle(isDarkMode),
                  color: isGuest ? '#10B981' : '#EF4444',
                }}
              >
                <span style={{ fontSize: '18px' }}>{isGuest ? '🔐' : '🚪'}</span>
                <span>{isGuest ? t('signIn') : t('signOut')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const menuItemStyle = (isDarkMode: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '14px',
  color: isDarkMode ? '#F3F4F6' : '#374151',
  textAlign: 'left',
});

export default MobileMenu;
