import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Drawer, Avatar, IconButton, Badge, Grid, Button, Divider,
  useMediaQuery, useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SvgIcon from '@mui/material/SvgIcon';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuthStore } from '@/app/store';
import { getUnreadCount } from '@/services/notificationService';

function GmailIcon() {
  return (
    <SvgIcon viewBox="0 0 24 24">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
    </SvgIcon>
  );
}

const NAV_ITEMS = [
  { label: 'Home', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Gmail Import', path: '/gmail-import', icon: <GmailIcon /> },
  { label: 'Expenses', path: '/expenses', icon: <MoneyOffIcon /> },
  { label: 'AI Insights', path: '/insights', icon: <SmartToyIcon /> },
  { label: 'More', path: null, icon: <MoreHorizIcon /> },
];

const DRAWER_ITEMS = [
  { label: 'Expenses', path: '/expenses', icon: '💸', color: '#E24B4A' },
  { label: 'Income', path: '/income', icon: '💰', color: '#00C9A7' },
  { label: 'Cards', path: '/credit-cards', icon: '💳', color: '#0EA5E9' },
  { label: 'Debts', path: '/debts', icon: '🏦', color: '#E24B4A' },
  { label: 'Subscriptions', path: '/subscriptions', icon: '🔄', color: '#0EA5E9' },
  { label: 'Budgets', path: '/budgets', icon: '📊', color: '#F59E0B' },
  { label: 'Reports', path: '/reports', icon: '📋', color: '#00C9A7' },
  { label: 'Notifications', path: '/notifications', icon: '🔔', color: '#8B5CF6' },
  { label: 'Profile', path: '/profile', icon: '👤', color: '#00C9A7' },
];

export default function BottomNav() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getUnreadCount();
        setUnreadCount(data.unread_count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isMdUp) return null;

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {/* Bottom bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          background: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderRadius: '20px 20px 0 0',
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1200,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.path && location.pathname === item.path;
          const isMore = item.label === 'More';
          return (
            <Box
              key={item.label}
              onClick={() => {
                if (isMore) setDrawerOpen(true);
                else if (item.path) navigate(item.path);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.25,
                py: 0.5,
                px: 2,
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '12px',
                background: isActive ? `${theme.palette.primary.main}20` : 'transparent',
                minWidth: 56,
                transition: 'all 0.2s',
              }}
            >
              {isActive && (
                <Box sx={{
                  position: 'absolute', top: 2,
                  width: 4, height: 4, borderRadius: '50%',
                  background: theme.palette.primary.main,
                }} />
              )}
              {isMore && unreadCount > 0 ? (
                <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16 } }}>
                  {item.icon}
                </Badge>
              ) : (
                <Box sx={{ color: isActive ? theme.palette.primary.main : theme.palette.text.secondary, display: 'flex' }}>
                  {item.icon}
                </Box>
              )}
              <Typography sx={{
                fontSize: 10,
                fontWeight: 600,
                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
              }}>
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* More Drawer */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            background: theme.palette.background.paper,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            maxHeight: '85vh',
          },
        }}
      >
        <Box sx={{ p: 2, pb: 'env(safe-area-inset-bottom)' }}>
          {/* Handle bar */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ width: 40, height: 4, borderRadius: 2, background: theme.palette.text.secondary }} />
          </Box>

          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={user?.avatar_url ? `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}${user.avatar_url}` : undefined}
                sx={{
                  width: 44, height: 44,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
              <Box>
                <Typography sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: 15 }}>
                  {user?.full_name || 'User'}
                </Typography>
                <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                  {user?.email || ''}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: theme.palette.text.secondary }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Divider */}
          <Divider sx={{ borderColor: theme.palette.divider, mb: 2 }} />

          {/* Navigation grid */}
          <Grid container spacing={1.5}>
            {DRAWER_ITEMS.map((item) => (
              <Grid item xs={3} key={item.label}>
                <Box
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate(item.path);
                  }}
                  sx={{
                    background: theme.palette.background.default,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '14px',
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: item.color },
                  }}
                >
                  <Box
                    sx={{
                      width: 40, height: 40, mx: 'auto', mb: 0.75,
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${item.color}20`,
                      fontSize: 20,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography sx={{ color: theme.palette.text.primary, fontSize: 11, fontWeight: 500 }} noWrap>
                    {item.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Logout */}
          <Divider sx={{ borderColor: theme.palette.divider, my: 2 }} />
          <Button
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={() => { setDrawerOpen(false); logout(); navigate('/login', { replace: true }); }}
            sx={{ color: theme.palette.text.secondary, textTransform: 'none', justifyContent: 'flex-start', borderRadius: '10px' }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
