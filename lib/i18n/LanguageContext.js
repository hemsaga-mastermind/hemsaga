// lib/i18n/LanguageContext.js
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import en from './en';
import sv from './sv';

const translations = { en, sv };
const STORAGE_KEY  = 'hemsaga_lang';

const LanguageContext = createContext({
  lang: 'en',
  t: en,
  setLang: () => {},
  toggleLang: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    // 1. Check localStorage (manual override wins)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) {
      setLangState(saved);
      return;
    }
    // 2. Auto-detect from browser
    const browser = navigator.language?.toLowerCase() || '';
    if (browser.startsWith('sv')) {
      setLangState('sv');
    }
    // Default stays 'en'
  }, []);

  const setLang = (l) => {
    if (!translations[l]) return;
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const toggleLang = () => setLang(lang === 'en' ? 'sv' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

// Standalone hook for pages that need just the language toggle button
export function LangToggle({ style = {} }) {
  const { lang, toggleLang } = useTranslation();
  return (
    <button
      onClick={toggleLang}
      title={lang === 'en' ? 'Byt till svenska' : 'Switch to English'}
      style={{
        background: 'transparent',
        border: '1.5px solid rgba(44,26,14,.15)',
        borderRadius: 20,
        padding: '5px 12px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1,
        color: '#8C6B4E',
        cursor: 'pointer',
        transition: 'all .2s',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        ...style,
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = '#C4724A'; e.currentTarget.style.color = '#C4724A'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(44,26,14,.15)'; e.currentTarget.style.color = '#8C6B4E'; }}
    >
      <span style={{ fontSize: 14 }}>{lang === 'en' ? '🇸🇪' : '🇬🇧'}</span>
      {lang === 'en' ? 'SV' : 'EN'}
    </button>
  );
}