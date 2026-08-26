import { createTheme, responsiveFontSizes, alpha, Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const brand = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

export const getTheme = (mode: ThemeMode): Theme => {
  const isDark = mode === 'dark';

  let theme = createTheme({
    palette: {
      mode,
      primary: {
        main: brand.indigo,
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: brand.violet,
        light: '#a78bfa',
        dark: '#7c3aed',
      },
      background: {
        default: isDark ? '#0c0c10' : '#f4f6fb',
        paper: isDark ? '#141419' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? alpha('#ffffff', 0.08) : alpha('#0f172a', 0.08),
      success: { main: '#22c55e' },
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      info: { main: brand.cyan },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#334155 transparent' : '#cbd5e1 transparent',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            padding: '8px 18px',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            background: `linear-gradient(135deg, ${brand.indigo} 0%, ${brand.violet} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.indigo} 0%, ${brand.purple} 100%)`,
            },
          },
          outlined: {
            borderColor: isDark ? alpha('#ffffff', 0.15) : alpha('#0f172a', 0.12),
            '&:hover': {
              borderColor: brand.indigo,
              backgroundColor: alpha(brand.indigo, 0.06),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${isDark ? alpha('#ffffff', 0.08) : alpha('#0f172a', 0.06)}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: isDark ? alpha('#ffffff', 0.08) : alpha('#0f172a', 0.08),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 500 },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
            },
          },
        },
      },
      MuiStepper: {
        styleOverrides: {
          root: {
            '& .MuiStepLabel-label': { fontWeight: 500 },
            '& .MuiStepIcon-root.Mui-active': { color: brand.indigo },
            '& .MuiStepIcon-root.Mui-completed': { color: brand.violet },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            backgroundColor: isDark ? alpha('#ffffff', 0.03) : '#f8fafc',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${isDark ? alpha('#ffffff', 0.08) : alpha('#0f172a', 0.06)}`,
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
};

export const gradientText = {
  background: `linear-gradient(135deg, ${brand.indigo} 0%, ${brand.violet} 50%, ${brand.purple} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const glowBackground = (isDark: boolean) => ({
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '80%',
    height: '60%',
    background: isDark
      ? `radial-gradient(ellipse, ${alpha(brand.violet, 0.15)} 0%, transparent 70%)`
      : `radial-gradient(ellipse, ${alpha(brand.indigo, 0.12)} 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },
});

export { brand };
