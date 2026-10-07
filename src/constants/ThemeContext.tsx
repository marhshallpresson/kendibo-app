import React, { createContext, useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { theme, lightColors, darkColors, ColorTokens, Theme } from './theme';

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

  const toggleTheme = () => setIsDark((prev) => !prev);
  const setScheme = (scheme: 'light' | 'dark') => setIsDark(scheme === 'dark');

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
