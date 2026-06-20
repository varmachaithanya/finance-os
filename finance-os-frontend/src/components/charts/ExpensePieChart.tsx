import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
import { CATEGORY_LOGOS } from '@/utils/logos';

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface ExpensePieChartProps {
  data: PieData[];
}

const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN')}`;
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: { name: string; value: number }[];
}> = ({ active, payload }) => {
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
        {payload[0].name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatCurrency(payload[0].value)}
      </Typography>
    </Box>
  );
};

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ data }) => {
  const theme = useTheme();
  const isEmpty = !data || data.length === 0;
  if (isEmpty) {
    return (
      <Box sx={(theme) => ({
        background: theme.palette.background.paper,
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        padding: '20px',
        height: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      })}>
        <Typography fontSize={15} fontWeight={600}
          color="text.primary" mb={2} alignSelf="flex-start">
          {'\u{1F4CA}'} Expense Breakdown
        </Typography>
        <Typography fontSize={32}>{'\u{1F4CA}'}</Typography>
        <Typography fontSize={13} color="text.secondary">
          No data yet
        </Typography>
        <Typography fontSize={11} color="text.secondary">
          Add expenses to see insights
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{
      backgroundColor: 'background.paper',
      borderRadius: '16px',
      border: 1,
      borderColor: 'divider',
      padding: '20px',
    }}>
      <Typography fontSize={15} fontWeight={600}
        color="text.primary" mb={2}>
        {'\u{1F4CA}'} Expense Breakdown
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          innerRadius={60}
          paddingAngle={3}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color || CATEGORY_LOGOS[entry.name]?.color || '#1976d2'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
    </Box>
  );
};

export default ExpensePieChart;
