import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme, ThemeMode } from '../theme/theme';

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'darkMode';

const readInitialMode = (): ThemeMode => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, String(next === 'dark'));
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  const value = useMemo(
    () => ({ mode, toggleMode, setMode }),
    [mode, toggleMode, setMode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = (): ThemeModeContextValue => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
};
