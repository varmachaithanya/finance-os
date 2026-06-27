import { IconButton } from '@mui/material';
import { useStore } from '@/app/store';

export default function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <IconButton
      onClick={toggle}
      size="small"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      sx={{
        color: theme === 'dark' ? '#10B981' : '#0F172A',
        border: '1px solid',
        borderColor: theme === 'dark' ? '#1E293B' : '#E2E8F0',
        borderRadius: '10px',
        width: 36,
        height: 36,
        '&:hover': {
          backgroundColor: theme === 'dark' ? '#1E293B' : '#F1F5F9',
        },
      }}
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </IconButton>
  );
}
