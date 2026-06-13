import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DRAWER_WIDTH = 240;

const AppLayout: React.FC = () => {
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
          transition: 'margin-left 0.3s ease',
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
