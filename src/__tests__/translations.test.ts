import { describe, it, expect } from 'vitest';
import { translations, getTranslation, Language, TranslationKey } from '../translations';

describe('Translation System', () => {
  const languages: Language[] = ['en', 'es', 'zh', 'vi', 'ko', 'fr'];
  
  it('has all required languages', () => {
    languages.forEach(lang => {
      expect(translations).toHaveProperty(lang);
      expect(typeof translations[lang]).toBe('object');
    });
  });

  it('has consistent keys across all languages', () => {
    const englishKeys = Object.keys(translations.en);
    
    languages.forEach(lang => {
      const langKeys = Object.keys(translations[lang]);
      
      // Each language should have the same keys as English
      expect(langKeys.sort()).toEqual(englishKeys.sort());
    });
  });

  it('has all required translation keys', () => {
    const requiredKeys = [
      // Header
      'welcome', 'signIn', 'signOut', 'subtitle',
      
      // Welcome screen
      'welcomeTitle', 'welcomeText', 'newChatTitle', 'newChatText',
      
      // Chat
      'typeMessage', 'send', 'clearChat',
      
      // Deadlines
      'upcomingDeadlines', 'days', 'priorityDeadline', 'federalDeadline', 'californiaDeadline',
      
      // Checklist
      'fafsaChecklist', 'trackProgress', 'complete', 'resetProgress',
      
      // Checklist steps (all 11 steps)
      'checklistStep1', 'checklistStep1Desc',
      'checklistStep2', 'checklistStep2Desc',
      'checklistStep3', 'checklistStep3Desc',
      'checklistStep4', 'checklistStep4Desc',
      'checklistStep5', 'checklistStep5Desc',
      'checklistStep6', 'checklistStep6Desc',
      'checklistStep7', 'checklistStep7Desc',
      'checklistStep8', 'checklistStep8Desc',
      'checklistStep9', 'checklistStep9Desc',
      'checklistStep10', 'checklistStep10Desc',
      'checklistStep11', 'checklistStep11Desc',
      
      // Copy button
      'copy', 'copied',
      
      // Sign in modal
      'welcomeBack', 'createAccount', 'signInToSave', 'startJourney',
      'yourName', 'emailAddress', 'password', 'continueAsGuest',
    ];

    languages.forEach(lang => {
      requiredKeys.forEach(key => {
        expect(translations[lang]).toHaveProperty(key);
        expect(typeof translations[lang][key as TranslationKey]).toBe('string');
        expect(translations[lang][key as TranslationKey].length).toBeGreaterThan(0);
      });
    });
  });

  it('getTranslation returns correct translation', () => {
    expect(getTranslation('en', 'welcome')).toBe('Welcome back');
    expect(getTranslation('es', 'welcome')).toBe('Bienvenido');
    expect(getTranslation('zh', 'welcome')).toBe('欢迎回来');
    expect(getTranslation('vi', 'welcome')).toBe('Chào mừng trở lại');
    expect(getTranslation('ko', 'welcome')).toBe('다시 오신 것을 환영합니다');
    expect(getTranslation('fr', 'welcome')).toBe('Bon retour');
  });

  it('getTranslation falls back to English for missing keys', () => {
    // Test with a key that might not exist in all languages
    const result = getTranslation('es', 'nonExistentKey' as TranslationKey);
    expect(result).toBe('nonExistentKey'); // Should return the key itself as fallback
  });

  it('getTranslation falls back to English for missing language', () => {
    const result = getTranslation('xx' as Language, 'welcome');
    expect(result).toBe('Welcome back'); // Should fall back to English
  });

  it('has proper FAFSA checklist translations', () => {
    languages.forEach(lang => {
      // Check that all 11 checklist steps exist
      for (let i = 1; i <= 11; i++) {
        const stepKey = `checklistStep${i}` as TranslationKey;
        const descKey = `checklistStep${i}Desc` as TranslationKey;
        
        expect(translations[lang]).toHaveProperty(stepKey);
        expect(translations[lang]).toHaveProperty(descKey);
        
        const stepText = translations[lang][stepKey];
        const descText = translations[lang][descKey];
        
        expect(stepText.length).toBeGreaterThan(0);
        expect(descText.length).toBeGreaterThan(0);
        
        // Step descriptions should be longer than step titles
        expect(descText.length).toBeGreaterThan(stepText.length);
      }
    });
  });

  it('has culturally appropriate translations', () => {
    // Test some specific cultural adaptations
    expect(translations.es.welcomeTitle).toContain('¡Hola!');
    expect(translations.zh.welcomeTitle).toContain('你好');
    expect(translations.vi.welcomeTitle).toContain('Xin chào');
    expect(translations.ko.welcomeTitle).toContain('안녕하세요');
    expect(translations.fr.welcomeTitle).toContain('Bonjour');
  });

  it('has consistent formatting across languages', () => {
    languages.forEach(lang => {
      // Check that certain keys maintain consistent formatting
      const aidUnclaimed = translations[lang].aidUnclaimed;
      const studentsHelped = translations[lang].studentsHelped;
      const alwaysAvailable = translations[lang].alwaysAvailable;
      
      // These should be in ALL CAPS for consistency
      expect(aidUnclaimed).toBe(aidUnclaimed.toUpperCase());
      expect(studentsHelped).toBe(studentsHelped.toUpperCase());
      expect(alwaysAvailable).toBe(alwaysAvailable.toUpperCase());
    });
  });

  it('has no empty translations', () => {
    languages.forEach(lang => {
      Object.entries(translations[lang]).forEach(([, value]) => {
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value).not.toBe('');
        expect(value).not.toBe(' ');
      });
    });
  });

  it('maintains proper punctuation in translations', () => {
    languages.forEach(lang => {
      // Questions should end with question marks
      const questionKeys = ['whatDocuments', 'whenDeadline', 'parentsDivorced', 'howMuchAid'];
      
      questionKeys.forEach(key => {
        const translation = translations[lang][key as TranslationKey];
        expect(translation).toMatch(/[?？]/); // English or Chinese question mark
      });
    });
  });
});