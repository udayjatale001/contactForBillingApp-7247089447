
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import en from '@/lib/locales/en';
import hi from '@/lib/locales/hi';

type Language = 'en' | 'hi';

type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translations, ...args: (string | number)[]) => string;
}

const translations = { en, hi };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const storedLanguage = localStorage.getItem('app-language') as Language;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'hi')) {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: keyof Translations, ...args: (string | number)[]): string => {
    let translation = translations[language][key] || translations['en'][key] || key;
    
    if (args.length > 0) {
        args.forEach((arg, index) => {
            const placeholder = `{${index}}`;
            translation = translation.replace(placeholder, String(arg));
        });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
