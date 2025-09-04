import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeName = 'claro' | 'noturno';

type ThemeTokens = {
  // Base tokens used across the app
  bg: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  primary: string;
  onPrimary: string;
  hover: string;
  // Sidebar specific (optional overrides)
  sidebarBg?: string;
  sidebarText?: string;
  sidebarMuted?: string;
  sidebarHover?: string;
};

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  tokenKeys: string[];
  getTokenValue: (key: string) => string;
  setTokenOverride: (key: string, value: string) => void;
  removeTokenOverride: (key: string) => void;
  resetThemeOverrides: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEMES: Record<ThemeName, ThemeTokens> = {
  claro: {
    bg: '#f3f4f6', // gray-100
    text: '#111827', // gray-900
    muted: '#6b7280', // gray-500
    border: '#e5e7eb', // gray-200
    surface: '#ffffff',
    primary: '#14b8a6', // teal-500
    onPrimary: '#ffffff',
    hover: '#f3f4f6', // gray-100
    sidebarBg: '#1e293b', // slate-800
    sidebarText: '#ffffff',
    sidebarMuted: '#cbd5e1', // slate-300
    sidebarHover: 'rgba(255,255,255,0.08)'
  },
  noturno: {
    bg: '#0b1220',
    text: '#e2e8f0', // slate-200
    muted: '#94a3b8', // slate-400
    border: '#1f2937', // gray-800
    surface: '#0f172a', // slate-900ish surface
    primary: '#14b8a6', // teal-500
    onPrimary: '#0b1220',
    hover: '#223047', // slightly brighter hover for contrast
    sidebarBg: '#060a14', // darker sidebar for melhor contraste
    sidebarText: '#e2e8f0',
    sidebarMuted: '#64748b',
    sidebarHover: 'rgba(255,255,255,0.08)'
  },
};

const TOKEN_KEYS = [
  'bg',
  'surface',
  'text',
  'muted',
  'border',
  'primary',
  'onPrimary',
  'hover',
  'sidebar-bg',
  'sidebar-text',
  'sidebar-muted',
];

function getOverrides(theme: ThemeName): Record<string, string> {
  try {
    const raw = localStorage.getItem(`theme_overrides_${theme}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(theme: ThemeName, overrides: Record<string, string>) {
  try {
    localStorage.setItem(`theme_overrides_${theme}`, JSON.stringify(overrides));
  } catch {}
}

function applyThemeToDocument(theme: ThemeName) {
  const tokens = THEMES[theme];
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Apply tokens as CSS variables
  root.style.setProperty('--bg', tokens.bg);
  root.style.setProperty('--text', tokens.text);
  root.style.setProperty('--muted', tokens.muted);
  root.style.setProperty('--border', tokens.border);
  root.style.setProperty('--surface', tokens.surface);
  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--on-primary', tokens.onPrimary);
  root.style.setProperty('--hover', tokens.hover);
  if (tokens.sidebarBg) root.style.setProperty('--sidebar-bg', tokens.sidebarBg);
  if (tokens.sidebarText) root.style.setProperty('--sidebar-text', tokens.sidebarText);
  if (tokens.sidebarMuted) root.style.setProperty('--sidebar-muted', tokens.sidebarMuted);
  if (tokens.sidebarHover) root.style.setProperty('--sidebar-hover', tokens.sidebarHover);

  // Apply overrides
  const overrides = getOverrides(theme);
  Object.entries(overrides).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const savedRaw = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    // Migração de valores antigos
    const mapOld: Record<string, ThemeName> = {
      classic: 'claro',
      light: 'claro',
      dark: 'noturno'
    };
    const saved = savedRaw && (mapOld[savedRaw] || (savedRaw as ThemeName));
    if (saved === 'claro' || saved === 'noturno') return saved;
    // Default para Claro como principal
    return 'claro';
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  // Alterna entre 'claro' e 'noturno' de acordo com ThemeName
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'claro' ? 'noturno' : 'claro')),
    []
  );

  const getTokenValue = useCallback((key: string) => {
    const root = document.documentElement;
    const val = getComputedStyle(root).getPropertyValue(`--${key}`).trim();
    return val;
  }, []);

  const setTokenOverride = useCallback((key: string, value: string) => {
    const overrides = getOverrides(theme);
    overrides[key] = value;
    saveOverrides(theme, overrides);
    document.documentElement.style.setProperty(`--${key}`, value);
  }, [theme]);

  const removeTokenOverride = useCallback((key: string) => {
    const overrides = getOverrides(theme);
    if (key in overrides) delete overrides[key];
    saveOverrides(theme, overrides);
    // Re-apply theme to restore base value for the key
    applyThemeToDocument(theme);
  }, [theme]);

  const resetThemeOverrides = useCallback(() => {
    try { localStorage.removeItem(`theme_overrides_${theme}`); } catch {}
    applyThemeToDocument(theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    tokenKeys: TOKEN_KEYS,
    getTokenValue,
    setTokenOverride,
    removeTokenOverride,
    resetThemeOverrides,
  }), [theme, setTheme, toggleTheme, getTokenValue, setTokenOverride, removeTokenOverride, resetThemeOverrides]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

