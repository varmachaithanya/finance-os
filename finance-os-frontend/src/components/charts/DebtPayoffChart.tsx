import { Box, Typography, useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { DebtPayoffPlan } from '@/services/aiService';

interface Props {
  snowball: DebtPayoffPlan;
  avalanche: DebtPayoffPlan;
}

export default function DebtPayoffChart({ snowball, avalanche }: Props) {
  const theme = useTheme();
  const maxMonths = Math.max(snowball.schedule.length, avalanche.schedule.length);
  const step = Math.max(1, Math.floor(maxMonths / 20));

  const merged: Record<number, { month: number; snowball: number | null; avalanche: number | null }> = {};
  for (let i = 1; i <= maxMonths; i += step) {
    merged[i] = { month: i, snowball: null, avalanche: null };
  }

  snowball.schedule.forEach(s => {
    if (merged[s.month]) merged[s.month].snowball = Math.round(s.balance);
  });
  avalanche.schedule.forEach(s => {
    if (merged[s.month]) merged[s.month].avalanche = Math.round(s.balance);
  });

  const data = Object.values(merged);

  return (
    <Box>
      <Typography fontSize={13} fontWeight={600} color="text.primary" mb={1}>
        Remaining Balance Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} label={{ value: 'Months', position: 'bottom', fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
          <Tooltip
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="snowball" stroke="#F59E0B" name="Snowball" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avalanche" stroke="#00C9A7" name="Avalanche" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
