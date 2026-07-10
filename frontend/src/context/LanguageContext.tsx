import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language, type TranslationKeys } from '../locales/translations';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKeys | string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Initialize from local storage or default to 'en'
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'ro' || saved === 'en') ? saved : 'en';
  });

  // Update local storage whenever language changes
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'ro' : 'en'));
  };

  // Safe nested lookup for "section.key" format
  const t = (key: TranslationKeys): any => {
    const parts = key.split('.');
    
    try {
      let current: any = translations[language];
      for (const part of parts) {
        current = current[part];
      }
      return current !== undefined ? current : key;
    } catch {
      return key; // Fallback to displaying the key name if something breaks
    }
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};