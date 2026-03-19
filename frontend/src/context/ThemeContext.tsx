import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, themeCategories, applyTheme } from '../styles/themes';

export type ThemeKey = keyof typeof themes;

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  availableThemes: typeof themes;
  themeCategories: typeof themeCategories;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'ordovertex-theme-v2';

// Get initial theme from localStorage or default
const getInitialTheme = (): ThemeKey => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey;
    if (saved && themes[saved]) {
      return saved;
    }
    
    // Check for legacy theme preference
    const legacyTheme = localStorage.getItem('ordovertex-theme');
    if (legacyTheme === 'light') return 'light';
    if (legacyTheme === 'dark') return 'dark';
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'dark';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(getInitialTheme);

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage errors
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't explicitly chosen a theme
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const newTheme = e.matches ? 'light' : 'dark';
        setThemeState(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((newTheme: ThemeKey) => {
    if (themes[newTheme]) {
      setThemeState(newTheme);
    }
  }, []);

  const value = {
    theme,
    setTheme,
    availableThemes: themes,
    themeCategories,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
