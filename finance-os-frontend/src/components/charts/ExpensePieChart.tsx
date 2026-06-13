import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography } from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';

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
  const isEmpty = !data || data.length === 0;
  if (isEmpty) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, minHeight: 350 }}>
        <PieChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No expense data to display
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Add some expenses to see your spending breakdown
        </Typography>
      </Box>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={350}>
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
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpensePieChart;
