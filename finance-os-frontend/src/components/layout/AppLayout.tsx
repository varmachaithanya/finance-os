import React, { useState, Suspense } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const FloatChatFab = React.lazy(() => import('@/components/chat/FloatingChatFab'));
const ChatPanel = React.lazy(() => import('@/components/chat/ChatPanel'));

const DRAWER_WIDTH = 240;

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopBar onMenuClick={handleDrawerToggle} />
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 8,
          display: 'flex',
          justifyContent: 'center',
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          pb: { xs: '80px', md: 0 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1600,
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
      <BottomNav />
      <Suspense fallback={null}>
        <FloatChatFab />
        <ChatPanel />
      </Suspense>
    </Box>
  );
};

export default AppLayout;
