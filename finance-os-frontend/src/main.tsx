import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useStore } from './app/store';
import { queryClient } from './app/queryClient';
import { lightTheme } from './theme/lightTheme';
import { darkTheme } from './theme/darkTheme';
import App from './App';

const Root = () => {
  const theme = useStore((state) => state.theme);

  return (
    <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
