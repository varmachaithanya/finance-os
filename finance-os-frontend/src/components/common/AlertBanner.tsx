import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';

interface AlertBannerProps {
  type: 'budget_alert' | 'due_date' | 'renewal' | 'info';
  title: string;
  message: string;
  action?: React.ReactNode;
}

const typeConfig: Record<
  string,
  { severity: 'error' | 'warning' | 'info' | 'success'; icon: React.ReactElement }
> = {
  budget_alert: {
    severity: 'error',
    icon: <WarningAmberIcon />,
  },
  due_date: {
    severity: 'warning',
    icon: <EventIcon />,
  },
  renewal: {
    severity: 'info',
    icon: <RefreshIcon />,
  },
  info: {
    severity: 'info',
    icon: <InfoIcon />,
  },
};

const AlertBanner: React.FC<AlertBannerProps> = ({ type, title, message, action }) => {
  const config = typeConfig[type] ?? typeConfig.info;

  return (
    <Alert
      severity={config.severity}
      icon={config.icon}
      action={action}
      sx={{ mb: 2 }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Box sx={{ fontSize: '0.875rem' }}>{message}</Box>
    </Alert>
  );
};

export default AlertBanner;
