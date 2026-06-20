import React from 'react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

interface DebtProgressChartProps {
  data: any[];
  debts?: any[];
  totalOwed?: number;
  totalPaid?: number;
}

const DebtProgressChart: React.FC<DebtProgressChartProps> = ({ data, debts, totalOwed, totalPaid }) => {
  const theme = useTheme();
  const computedTotalDebt = debts?.reduce((sum: number, d: any) =>
    sum + parseFloat(d.total_amount || 0), 0) || 0;
  const computedTotalPaid = debts?.reduce((sum: number, d: any) =>
    sum + parseFloat(d.paid_amount || 0), 0) || 0;
  const tDebt = totalOwed ?? computedTotalDebt;
  const tPaid = totalPaid ?? computedTotalPaid;
  const paidPct = tDebt > 0
    ? Math.round((tPaid / tDebt) * 100) : 0;

  const radialData = [{ name: 'Paid', value: paidPct, fill: '#00C9A7' }];

  const isEmpty = !data || data.length === 0;

  if (isEmpty && !debts) {
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
          {'\u{1F3AF}'} Debt Payoff Progress
        </Typography>
        <Typography fontSize={32}>{'\u{1F4CA}'}</Typography>
        <Typography fontSize={13} color="text.secondary">
          No data yet
        </Typography>
        <Typography fontSize={11} color="text.secondary">
          Add debts to see progress
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
        {'\u{1F3AF}'} Debt Payoff Progress
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%" outerRadius="100%"
              data={radialData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false}/>
              <RadialBar dataKey="value" cornerRadius={10}
                background={{ fill: theme.palette.divider }}/>
            </RadialBarChart>
          </ResponsiveContainer>
          <Typography textAlign="center" fontSize={20}
            fontWeight={700} color="#00C9A7" mt={-8}>
            {paidPct}%
          </Typography>
          <Typography textAlign="center" fontSize={11}
            color="text.secondary" mt={7}>
            paid off
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Typography fontSize={11} color="text.secondary">Total Debt</Typography>
            <Typography fontSize={16} fontWeight={600} color="#E24B4A">
              {'\u20B9'}{tDebt.toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography fontSize={11} color="text.secondary">Total Paid</Typography>
            <Typography fontSize={16} fontWeight={600} color="#00C9A7">
              {'\u20B9'}{tPaid.toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography fontSize={11} color="text.secondary">Remaining</Typography>
            <Typography fontSize={16} fontWeight={600} color="text.primary">
              {'\u20B9'}{(tDebt - tPaid).toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DebtProgressChart;
