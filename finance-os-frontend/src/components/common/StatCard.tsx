import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface Trend {
  value: number;
  isUp: boolean;
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: Trend;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}) => {
  return (
    <Card
      sx={{
        borderLeft: `4px solid ${color}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {formatCurrency(value)}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto', pt: 1 }}>
            {trend.isUp ? (
              <TrendingUpIcon fontSize="small" color="success" />
            ) : (
              <TrendingDownIcon fontSize="small" color="error" />
            )}
            <Typography
              variant="caption"
              color={trend.isUp ? 'success.main' : 'error.main'}
            >
              {trend.isUp ? '+' : ''}{trend.value}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
