// lib/i18n/LanguageContext.js
'use client';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import en from './en';
import sv from './sv';
import ar from './ar';
import fi from './fi';
import pl from './pl';
import es from './es';

const translations = { en, sv, ar, fi, pl, es };
const STORAGE_KEY = 'hemsaga_lang';

// Labels for language selector (native names)
export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'sv', label: 'Svenska' },
  { code: 'ar', label: 'العربية' },
  { code: 'fi', label: 'Suomi' },
  { code: 'pl', label: 'Polski' },
  { code: 'es', label: 'Español' },
];

const LanguageContext = createContext({
  lang: 'en',
  t: en,
  setLang: () => {},
  toggleLang: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) {
      setLangState(saved);
      return;
    }
    const browser = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browser.startsWith('sv')) setLangState('sv');
    else if (browser.startsWith('ar')) setLangState('ar');
    else if (browser.startsWith('fi')) setLangState('fi');
    else if (browser.startsWith('pl')) setLangState('pl');
    else if (browser.startsWith('es')) setLangState('es');
  }, []);

  const setLang = (l) => {
    if (!translations[l]) return;
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const toggleLang = () => {
    const list = LANGUAGE_OPTIONS.map(o => o.code);
    const i = list.indexOf(lang);
    setLang(list[(i + 1) % list.length]);
  };

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang] || en, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export function LangToggle({ style = {} }) {
  const { lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const current = LANGUAGE_OPTIONS.find(o => o.code === lang) || LANGUAGE_OPTIONS[0];

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Choose language"
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
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = '#C4724A'; e.currentTarget.style.color = '#C4724A'; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(44,26,14,.15)'; e.currentTarget.style.color = '#8C6B4E'; }}
      >
        <span style={{ fontSize: 14 }}>🌐</span>
        <span>{current.label}</span>
      </button>
      {open && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            padding: '6px 0',
            minWidth: 120,
            background: '#fff',
            border: '1px solid rgba(44,26,14,.12)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(44,26,14,.12)',
            listStyle: 'none',
            zIndex: 1000,
          }}
        >
          {LANGUAGE_OPTIONS.map(({ code, label }) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => { setLang(code); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: code === lang ? 'rgba(196,114,74,.1)' : 'transparent',
                  color: code === lang ? '#8C5A3C' : '#2C1A0E',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}