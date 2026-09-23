import { useState, useEffect } from 'react';
import type { Language } from '../types/catalog';

export function useLanguage(defaultLang: Language = 'ar') {
  const [lang, setLang] = useState<Language>(defaultLang);

  useEffect(() => {
    const saved = localStorage.getItem('clarea_lang') as Language;
    if (saved === 'en' || saved === 'ar') {
      setLang(saved);
    }
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('clarea_lang', newLang);
  };

  return [lang, changeLang] as const;
}
