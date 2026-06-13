import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { Box, Typography } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';

interface TrendData {
  month: string;
  amount: number;
}

interface MonthlyTrendChartProps {
  data: TrendData[];
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

const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  const isEmpty = !data || data.length === 0;
  if (isEmpty) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, minHeight: 350 }}>
        <ShowChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No trend data to display
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Add transactions to see your monthly spending trends
        </Typography>
      </Box>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          fill="url(#trendGradient)"
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#1976d2"
          strokeWidth={2}
          dot={{ r: 4, fill: '#1976d2' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlyTrendChart;
