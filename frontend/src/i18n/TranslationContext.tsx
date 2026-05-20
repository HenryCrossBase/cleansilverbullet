'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './dictionaries/en.json';
import es from './dictionaries/es.json';
import zh from './dictionaries/zh.json';

export type Language = 'en' | 'es' | 'zh';
type Dictionary = any; // Using any to avoid strict type checking across massive nested files

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const dictionaries: Record<Language, Dictionary> = {
  en,
  es,
  zh
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('sb_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'es' || savedLang === 'zh')) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sb_lang', lang);
  };

  const t = (keyStr: string): string => {
    const keys = keyStr.split('.');
    let current: any = dictionaries[language];
    
    for (const key of keys) {
      if (current === undefined || current[key] === undefined) {

        let fallback: any = dictionaries['en'];
        for (const fKey of keys) {
          if (fallback === undefined || fallback[fKey] === undefined) return keyStr; 
          fallback = fallback[fKey];
        }
        return fallback;
      }
      current = current[key];
    }
    
    return current;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
