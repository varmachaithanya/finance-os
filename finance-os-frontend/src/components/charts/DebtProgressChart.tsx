import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface DebtData {
  month: string;
  total_debt: number;
}

interface DebtProgressChartProps {
  data: DebtData[];
}

const formatCurrency = (value: number): string => {
  return '\u20B9' + value.toLocaleString('en-IN');
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatCurrency(payload[0].value)}
      </Typography>
    </Box>
  );
};

const DebtProgressChart: React.FC<DebtProgressChartProps> = ({ data }) => {
  const isEmpty = !data || data.length === 0;
  if (isEmpty) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, minHeight: 350 }}>
        <TrendingDownIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No debt progress data to display
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Add debts to track your reduction progress
        </Typography>
      </Box>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
      >
        <defs>
          <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d32f2f" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#d32f2f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total_debt"
          stroke="#d32f2f"
          strokeWidth={2}
          fill="url(#debtGradient)"
          dot={{ r: 4, fill: '#d32f2f' }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default DebtProgressChart;
