import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RepeatIcon from '@mui/icons-material/Repeat';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import SavingsIcon from '@mui/icons-material/Savings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const mainLinks: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Insights', path: '/insights', icon: <SmartToyIcon /> },
  { label: 'Expenses', path: '/expenses', icon: <MoneyOffIcon /> },
  { label: 'Income', path: '/income', icon: <AttachMoneyIcon /> },
  { label: 'Credit Cards', path: '/credit-cards', icon: <CreditCardIcon /> },
  { label: 'Debts', path: '/debts', icon: <AccountBalanceIcon /> },
  { label: 'Subscriptions', path: '/subscriptions', icon: <RepeatIcon /> },
  { label: 'Budgets', path: '/budgets', icon: <AccountBalanceWalletIcon /> },
  { label: 'Reports', path: '/reports', icon: <AssessmentIcon /> },
  { label: 'Smart Sync', path: '/smart-sync', icon: <MailOutlineIcon /> },
  { label: 'Predictions', path: '/predictions', icon: <AutoGraphIcon /> },
  { label: 'Saving Tips', path: '/savings-suggestions', icon: <SavingsIcon /> },
  { label: 'Spending Alerts', path: '/spending-alerts', icon: <WarningAmberIcon /> },
  { label: 'EMI Calculator', path: '/tools/emi-calculator', icon: <CalculateIcon /> },
  { label: 'Debt Strategy', path: '/debt-optimizer', icon: <TrackChangesIcon /> },
];

const bottomLinks: NavItem[] = [
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
  { label: 'Profile', path: '/profile', icon: <PersonIcon /> },
];

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ drawerWidth, mobileOpen, onClose }) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const navContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <List sx={{ flexGrow: 1 }}>
        {mainLinks.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              onClick={() => { if (!isMdUp) onClose(); }}
              sx={({ palette }) => ({
                borderRadius: '12px',
                mx: 1,
                mb: 0.25,
                '&.active': {
                  backgroundColor: '#10B98120',
                  color: '#10B981',
                  '& .MuiListItemIcon-root': {
                    color: '#10B981',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 20,
                    borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(135deg, #10B981, #14B8A6)',
                  },
                },
              })}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {bottomLinks.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              onClick={() => { if (!isMdUp) onClose(); }}
              sx={({ palette }) => ({
                borderRadius: '12px',
                mx: 1,
                mb: 0.25,
                '&.active': {
                  backgroundColor: '#10B98120',
                  color: '#10B981',
                  '& .MuiListItemIcon-root': {
                    color: '#10B981',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 20,
                    borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(135deg, #10B981, #14B8A6)',
                  },
                },
              })}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {isMdUp ? (
        <Drawer
          variant="permanent"
          open
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {navContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {navContent}
        </Drawer>
      )}
    </Box>
  );
};

export default Sidebar;
