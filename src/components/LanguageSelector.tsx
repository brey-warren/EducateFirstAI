import React, { useState } from 'react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <div style={styles.container}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.button}
        title="Change language"
      >
        <span style={styles.flag}>{currentLang.flag}</span>
        <span style={styles.code} className="language-code">{currentLang.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsOpen(false)} />
          <div style={styles.dropdown}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setIsOpen(false);
                }}
                style={{
                  ...styles.option,
                  ...(currentLanguage === lang.code ? styles.optionActive : {}),
                }}
              >
                <span style={styles.optionFlag}>{lang.flag}</span>
                <div style={styles.optionText}>
                  <span style={styles.optionName}>{lang.name}</span>
                  <span style={styles.optionNative}>{lang.nativeName}</span>
                </div>
                {currentLanguage === lang.code && (
                  <span style={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },
  flag: {
    fontSize: '18px',
  },
  code: {
    fontSize: '12px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    zIndex: 101,
    minWidth: '200px',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.2s',
  },
  optionActive: {
    background: '#F0FDF4',
  },
  optionFlag: {
    fontSize: '24px',
  },
  optionText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  optionName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1F2937',
  },
  optionNative: {
    fontSize: '12px',
    color: '#6B7280',
  },
  checkmark: {
    color: '#10B981',
    fontWeight: 'bold',
  },
};

export default LanguageSelector;
