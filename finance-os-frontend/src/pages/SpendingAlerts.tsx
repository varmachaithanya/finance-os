import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Typography, Chip, Button, Skeleton, Alert, IconButton, Snackbar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PageHeader from '@/components/common/PageHeader';
import { aiService } from '@/services/aiService';

const severityConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  high: { color: '#E24B4A', bg: '#E24B4A20', icon: <ErrorIcon sx={{ fontSize: 20, color: '#E24B4A' }} /> },
  medium: { color: '#F59E0B', bg: '#F59E0B20', icon: <WarningAmberIcon sx={{ fontSize: 20, color: '#F59E0B' }} /> },
  low: { color: '#0EA5E9', bg: '#0EA5E920', icon: <InfoIcon sx={{ fontSize: 20, color: '#0EA5E9' }} /> },
};

export default function SpendingAlerts() {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'anomalies'],
    queryFn: () => aiService.getAnomalies(),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => aiService.resolveAnomaly(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'anomalies'] });
      setSnackbar({ open: true, message: 'Alert resolved' });
    },
  });

  return (
    <Box>
      <PageHeader
        title="Spending Alerts"
        icon="⚡"
        actions={
          data && data.unread_count > 0 ? (
            <Chip label={`${data.unread_count} unresolved`} size="small" sx={{ background: '#E24B4A20', color: '#E24B4A', fontWeight: 600 }} />
          ) : undefined
        }
      />

      {isLoading && <Skeleton variant="rounded" height={300} />}

      {data && data.anomalies.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography fontSize={40}>✅</Typography>
          <Typography fontSize={16} fontWeight={600} color="text.primary" mt={1}>No Spending Anomalies</Typography>
          <Typography fontSize={13} color="text.secondary">Your spending patterns look normal.</Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {data?.anomalies.map(a => {
          const cfg = severityConfig[a.severity] || severityConfig.low;
          return (
            <Paper key={a.id} sx={{ p: 2, borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ mt: 0.25 }}>{cfg.icon}</Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography fontWeight={600} fontSize={14} color="text.primary">{a.title}</Typography>
                    <Chip label={a.severity.toUpperCase()} size="small" sx={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }} />
                    {a.category_name && <Chip label={a.category_name} size="small" sx={{ fontSize: 10, background: '#0EA5E920', color: '#0EA5E9' }} />}
                  </Box>
                  <Typography fontSize={13} color="text.secondary">{a.message}</Typography>
                  <Typography fontSize={11} color="text.secondary" mt={0.5}>
                    {new Date(a.created_at).toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => resolveMutation.mutate(a.id)} sx={{ color: '#00C9A7' }}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} message={snackbar.message} />
    </Box>
  );
}
