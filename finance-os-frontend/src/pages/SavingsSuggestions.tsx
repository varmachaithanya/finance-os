import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Skeleton, Chip, Alert, Grid } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import PageHeader from '@/components/common/PageHeader';
import { aiService } from '@/services/aiService';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const priorityConfig: Record<string, { color: string; bg: string }> = {
  high: { color: '#E24B4A', bg: '#E24B4A20' },
  medium: { color: '#F59E0B', bg: '#F59E0B20' },
  low: { color: '#00C9A7', bg: '#00C9A720' },
};

export default function SavingsSuggestions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai', 'savings'],
    queryFn: () => aiService.getSavingsSuggestions(),
  });

  return (
    <Box>
      <PageHeader title="Smart Saving Suggestions" icon="💡" />

      {isLoading && <Skeleton variant="rounded" height={300} />}
      {error && <Alert severity="error">Failed to load suggestions</Alert>}

      {data && data.suggestions.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography fontSize={40}>💰</Typography>
          <Typography color="text.secondary" mt={1}>No savings suggestions available yet. Add more expense data.</Typography>
        </Paper>
      )}

      {data && data.suggestions.length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, flex: 1, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography fontSize={12} color="text.secondary">Potential Monthly Savings</Typography>
              <Typography fontSize={24} fontWeight={700} color="#00C9A7">{fmtCurrency(data.total_monthly_savings)}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography fontSize={12} color="text.secondary">Potential Yearly Savings</Typography>
              <Typography fontSize={24} fontWeight={700} color="#F59E0B">{fmtCurrency(data.total_yearly_savings)}</Typography>
            </Paper>
          </Box>

          <Grid container spacing={2}>
            {data.suggestions.map((s, idx) => {
              const cfg = priorityConfig[s.priority] || priorityConfig.low;
              return (
                <Grid item xs={12} key={idx}>
                  <Paper sx={{ p: 2.5, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                      <SavingsIcon sx={{ fontSize: 20, color: cfg.color }} />
                      <Typography fontWeight={600} fontSize={15} color="text.primary">{s.title}</Typography>
                      <Chip label={s.priority.toUpperCase()} size="small" sx={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }} />
                      {s.category && <Chip label={s.category} size="small" sx={{ fontSize: 10, background: '#0EA5E920', color: '#0EA5E9' }} />}
                    </Box>
                    <Typography fontSize={13} color="text.secondary" mb={1.5}>{s.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography fontSize={13} fontWeight={600} color="#00C9A7">Save {fmtCurrency(s.monthly_savings)}/month</Typography>
                      <Typography fontSize={13} fontWeight={600} color="#F59E0B">{fmtCurrency(s.yearly_savings)}/year</Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
}
