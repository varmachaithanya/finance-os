import { Box, Typography, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  principal: number;
  interest: number;
}

export default function AmortizationChart({ principal, interest }: Props) {
  const theme = useTheme();
  const data = [
    { name: 'Principal', value: principal },
    { name: 'Interest', value: interest },
  ];
  const COLORS = [theme.palette.primary.main, '#EF9F27'];

  return (
    <Box>
      <Typography fontSize={13} fontWeight={600} color="text.primary" mb={1}>
        Principal vs Interest
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, undefined]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
