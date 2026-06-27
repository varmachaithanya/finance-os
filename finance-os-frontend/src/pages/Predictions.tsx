import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Skeleton, Chip, Grid, Alert } from '@mui/material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PageHeader from '@/components/common/PageHeader';
import PredictionChart from '@/components/charts/PredictionChart';
import { aiService } from '@/services/aiService';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Predictions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai', 'predictions'],
    queryFn: () => aiService.getPredictions(),
  });

  return (
    <Box>
      <PageHeader title="Expense Predictions" icon="🔮" />

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={80} />)}
        </Box>
      )}

      {error && <Alert severity="error">Failed to load predictions</Alert>}

      {data && data.predictions.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography fontSize={40}>📊</Typography>
          <Typography color="text.secondary" mt={1}>
            Not enough expense data to generate predictions. Add more expenses first.
          </Typography>
        </Paper>
      )}

      {data && data.predictions.length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 200, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography fontSize={12} color="text.secondary">Predicted Month</Typography>
              <Typography fontSize={20} fontWeight={700} color="text.primary">
                {new Date(data.next_year, data.next_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 200, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography fontSize={12} color="text.secondary">Categories Analyzed</Typography>
              <Typography fontSize={20} fontWeight={700} color="text.primary">{data.predictions.length}</Typography>
            </Paper>
          </Box>

          <Grid container spacing={2}>
            {data.predictions.slice(0, 5).map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.category_name}>
                <Paper sx={{ p: 2, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AutoGraphIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography fontWeight={600} fontSize={15} color="text.primary">{p.category_name}</Typography>
                  </Box>
                  <Typography fontSize={12} color="text.secondary">Expected Next Month</Typography>
                  <Typography fontSize={22} fontWeight={700} color="primary.main">{fmtCurrency(p.predicted_amount)}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Box>
                      <Typography fontSize={11} color="text.secondary">Current Avg</Typography>
                      <Typography fontSize={13} fontWeight={600} color="text.primary">{fmtCurrency(p.current_average)}</Typography>
                    </Box>
                    <Box>
                      <Typography fontSize={11} color="text.secondary">Confidence</Typography>
                      <Chip
                        label={`${p.confidence_score}%`}
                        size="small"
                        sx={{
                          fontSize: 10, fontWeight: 600,
                          background: p.confidence_score > 80 ? '#10B98120' : p.confidence_score > 60 ? '#F59E0B20' : '#EF444420',
                          color: p.confidence_score > 80 ? '#10B981' : p.confidence_score > 60 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ p: 2.5, mt: 3, borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <PredictionChart predictions={data.predictions} />
          </Paper>
        </>
      )}
    </Box>
  );
}
