import { createTheme } from '@mui/material/styles';
import { colors } from './colors';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.secondary,
      dark: colors.primary,
    },
    secondary: {
      main: colors.secondary,
    },
    error: {
      main: colors.error,
    },
    success: {
      main: colors.success,
    },
    warning: {
      main: colors.warning,
    },
    background: {
      default: colors.bg,
      paper: colors.surface,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.border,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 15,
          padding: '14px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: colors.surface,
            '& fieldset': {
              borderColor: colors.border,
            },
            '&:hover fieldset': {
              borderColor: colors.border,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
              borderWidth: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: colors.textSecondary,
          },
          '& .MuiInputBase-input': {
            color: colors.textPrimary,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            color: colors.textSecondary,
            fontWeight: 500,
          },
        },
      },
    },
  },
});
