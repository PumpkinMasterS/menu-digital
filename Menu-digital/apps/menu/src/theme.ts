import { createTheme, type ThemeOptions } from '@mui/material/styles';

export type AppearanceSettings = {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  shapeRadius: number;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'light',
  primaryColor: '#F51414',
  secondaryColor: '#111111',
  fontFamily:
    "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
  shapeRadius: 12,
};

export function createAppTheme(settings: Partial<AppearanceSettings> = {}) {
  const s: AppearanceSettings = { ...DEFAULT_APPEARANCE, ...settings };
  const isDark = s.mode === 'dark';

  const options: ThemeOptions = {
    palette: {
      mode: s.mode,
      primary: { main: s.primaryColor },
      secondary: { main: s.secondaryColor },
      background: {
        default: isDark ? '#0f0f0f' : '#ffffff',
        paper: isDark ? '#151515' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#000000',
        secondary: isDark ? '#cccccc' : '#666666',
      },
    },
    shape: { borderRadius: s.shapeRadius },
    typography: {
      fontFamily: s.fontFamily,
      fontWeightBold: 700,
      fontWeightMedium: 600,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: Math.max(8, s.shapeRadius - 4),
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: s.shapeRadius,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(8, s.shapeRadius - 2),
          },
        },
      },
    },
  };

  return createTheme(options);
}

// Default export theme using built-in defaults
export const theme = createAppTheme();