import { Box, Typography, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CategoryPrediction } from '@/services/aiService';

interface Props {
  predictions: CategoryPrediction[];
}

export default function PredictionChart({ predictions }: Props) {
  const theme = useTheme();
  const data = predictions.slice(0, 5).map(p => ({
    name: p.category_name,
    Current: p.current_average,
    Predicted: p.predicted_amount,
  }));

  if (data.length === 0) return null;

  return (
    <Box>
      <Typography fontSize={13} fontWeight={600} color="text.primary" mb={1}>
        Historical vs Predicted (Top 5)
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
          <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
          <Tooltip
            contentStyle={{
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Current" fill={theme.palette.text.secondary} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Predicted" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
