import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';

interface BarData {
  month: string;
  income: number;
  expenses: number;
}

interface IncomeVsExpenseChartProps {
  data: BarData[];
}

const formatCurrency = (value: number): string => {
  return '\u20B9' + value.toLocaleString('en-IN');
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: { name: string; value: number }[];
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
      <Typography variant="body2" fontWeight={600} mb={0.5}>
        {label}
      </Typography>
      {payload.map((entry) => (
        <Typography
          key={entry.name}
          variant="body2"
          color={entry.name === 'income' ? 'success.main' : 'error.main'}
        >
          {entry.name === 'income' ? 'Income' : 'Expenses'}: {formatCurrency(entry.value)}
        </Typography>
      ))}
    </Box>
  );
};

const IncomeVsExpenseChart: React.FC<IncomeVsExpenseChartProps> = ({ data }) => {
  const isEmpty = !data || data.length === 0;
  if (isEmpty) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, minHeight: 350 }}>
        <BarChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No comparison data to display
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Add income and expenses to see your monthly comparison
        </Typography>
      </Box>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="income"
          name="Income"
          fill="#2e7d32"
          radius={[4, 4, 0, 0]}
          barSize={20}
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="#d32f2f"
          radius={[4, 4, 0, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeVsExpenseChart;
