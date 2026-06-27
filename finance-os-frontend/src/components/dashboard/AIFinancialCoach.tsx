import { Box, Typography, Grid, Paper, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import SavingsIcon from '@mui/icons-material/Savings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

interface Props {
  predictionCount?: number;
  savingsCount?: number;
  anomalyCount?: number;
  hasDebtPlan?: boolean;
}

export default function AIFinancialCoach({ predictionCount = 0, savingsCount = 0, anomalyCount = 0, hasDebtPlan = false }: Props) {
  const navigate = useNavigate();

  const cards = [
    {
      icon: <AutoGraphIcon sx={{ fontSize: 28, color: '#00C9A7' }} />,
      title: 'Expense Predictions',
      count: predictionCount,
      label: 'categories predicted',
      path: '/predictions',
      color: '#00C9A7',
    },
    {
      icon: <SavingsIcon sx={{ fontSize: 28, color: '#F59E0B' }} />,
      title: 'Saving Opportunities',
      count: savingsCount,
      label: 'suggestions',
      path: '/savings-suggestions',
      color: '#F59E0B',
    },
    {
      icon: <WarningAmberIcon sx={{ fontSize: 28, color: '#E24B4A' }} />,
      title: 'Spending Alerts',
      count: anomalyCount,
      label: 'unresolved',
      path: '/spending-alerts',
      color: '#E24B4A',
    },
    {
      icon: <TrackChangesIcon sx={{ fontSize: 28, color: '#0EA5E9' }} />,
      title: 'Debt Strategy',
      count: hasDebtPlan ? 1 : 0,
      label: hasDebtPlan ? 'plan ready' : 'no debts',
      path: '/debt-optimizer',
      color: '#0EA5E9',
    },
  ];

  return (
    <Paper sx={{ p: 2.5, background: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography fontSize={20}>🤖</Typography>
        <Typography fontSize={16} fontWeight={600} color="text.primary">
          AI Financial Coach
        </Typography>
      </Box>
      <Grid container spacing={1.5}>
        {cards.map(card => (
          <Grid item xs={6} sm={3} key={card.title}>
            <Box
              onClick={() => navigate(card.path)}
              sx={{
                p: 1.5, borderRadius: '12px', cursor: 'pointer',
                background: `${card.color}10`,
                border: '1px solid', borderColor: `${card.color}20`,
                transition: 'all 0.2s',
                '&:hover': { borderColor: card.color, transform: 'translateY(-1px)' },
              }}
            >
              {card.icon}
              <Typography fontSize={13} fontWeight={600} color="text.primary" mt={0.5}>
                {card.title}
              </Typography>
              <Chip
                label={`${card.count} ${card.label}`}
                size="small"
                sx={{ mt: 0.5, fontSize: 10, background: `${card.color}20`, color: card.color, fontWeight: 600 }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
