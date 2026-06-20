import { createTheme } from '@mui/material/styles';
import { lightColors as colors } from './colors';

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
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-body': {
            color: colors.textPrimary,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${colors.border}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
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
        input: {
          color: colors.textPrimary,
        },
        notchedOutline: {
          borderColor: colors.border,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.textSecondary,
          '&.Mui-focused': {
            color: colors.primary,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          color: colors.textPrimary,
        },
        icon: {
          color: colors.textSecondary,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: colors.textPrimary,
          '&:hover': {
            backgroundColor: 'rgba(0, 201, 167, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 201, 167, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(0, 201, 167, 0.2)',
            },
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          color: colors.textSecondary,
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          color: colors.textSecondary,
          '&:hover': {
            color: colors.textPrimary,
          },
          '&.Mui-active': {
            color: colors.primary,
          },
        },
        icon: {
          color: `${colors.primary} !important`,
        },
      },
    },
  },
});
