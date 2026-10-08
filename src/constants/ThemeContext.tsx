import React, { createContext, useContext, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, lightColors, darkColors, ColorTokens, Theme } from './theme';

const THEME_STORAGE_KEY = 'kendibo_theme';

export interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  colors: ColorTokens;
  toggleTheme: () => void;
  setScheme: (scheme: 'light' | 'dark') => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  theme: theme.light,
  colors: lightColors,
  toggleTheme: () => {},
  setScheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'dark' || saved === 'light')) {
          setIsDark(saved === 'dark');
        }
      })
      .catch(() => {
        /* keep default light */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistScheme = (scheme: 'light' | 'dark') => {
    AsyncStorage.setItem(THEME_STORAGE_KEY, scheme).catch(() => {
      /* non-fatal: preference stays in memory for this session */
    });
  };

  const toggleTheme = () =>
    setIsDark((prev) => {
      const next = !prev;
      persistScheme(next ? 'dark' : 'light');
      return next;
    });

  const setScheme = (scheme: 'light' | 'dark') => {
    setIsDark(scheme === 'dark');
    persistScheme(scheme);
  };

  const currentTheme = isDark ? theme.dark : theme.light;
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        theme: currentTheme,
        colors,
        toggleTheme,
        setScheme,
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}
