import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

interface BarData {
  month: string;
  income: number;
  expenses: number;
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}> = ({ active, payload, label }) => {
  const theme = useTheme();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <Box sx={{
      backgroundColor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      borderRadius: '10px',
      padding: '12px 16px',
    }}>
      <Typography fontSize={12} color="text.secondary" mb={1}>
        {label}
      </Typography>
      {payload.map((entry: any) => (
        <Typography key={entry.name} fontSize={13}
          color={entry.color} fontWeight={500}>
          {entry.name}: {'\u20B9'}{Number(entry.value).toLocaleString('en-IN')}
        </Typography>
      ))}
    </Box>
  );
};

const EmptyChart = ({ title }: { title: string }) => (
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
      {title}
    </Typography>
    <Typography fontSize={32}>{'\u{1F4B0}'}</Typography>
    <Typography fontSize={13} color="text.secondary">
      No data yet
    </Typography>
    <Typography fontSize={11} color="text.secondary">
      Add transactions to see insights
    </Typography>
  </Box>
);

interface IncomeVsExpenseChartProps {
  data: BarData[];
}

const IncomeVsExpenseChart: React.FC<IncomeVsExpenseChartProps> = ({ data }) => {
  const theme = useTheme();
  if (!data || data.length === 0) {
    return <EmptyChart title="Income vs Expenses" />;
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
        {'\u{1F4B0}'} Income vs Expenses
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider}
            vertical={false}/>
          <XAxis dataKey="month" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={false} tickLine={false}
            tickFormatter={(v) => `\u20B9${(v/1000).toFixed(0)}k`}/>
          <Tooltip content={<CustomTooltip />}/>
          <Legend
            wrapperStyle={{ fontSize: '12px', color: theme.palette.text.secondary }}/>
          <Bar dataKey="income" name="Income"
            fill="#10B981" radius={[6,6,0,0]} maxBarSize={32}/>
          <Bar dataKey="expenses" name="Expenses"
            fill="#EF4444" radius={[6,6,0,0]} maxBarSize={32}/>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default IncomeVsExpenseChart;
