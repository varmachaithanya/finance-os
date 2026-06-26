import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Paper, Typography, Button, Chip, Checkbox, Grid, Avatar, MenuItem, TextField,
  Snackbar, Alert, CircularProgress, Skeleton, Select, FormControl, useTheme,
} from '@mui/material';
import PageHeader from '@/components/common/PageHeader';
import { gmailService, GmailTransaction } from '@/services/gmailService';
import { useAuthStore } from '@/app/store';

const BANK_COLORS: Record<string, string> = {
  'HDFC Bank': '#004C8C',
  'ICICI Bank': '#F58220',
  'Axis Bank': '#9700A3',
  'SBI': '#003366',
  'Kotak Mahindra': '#003D7A',
};

export default function GmailImport() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState(30);
  const [transactions, setTransactions] = useState<GmailTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => gmailService.getStatus(),
  });

  const fetchMutation = useMutation({
    mutationFn: () => gmailService.fetchTransactions(days),
    onSuccess: (data) => {
      setTransactions(data.transactions.map(t => ({ ...t, selected: false })));
      setSelectedIds(new Set());
      setFetched(true);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Failed to fetch transactions', severity: 'error' });
    },
  });

  const importMutation = useMutation({
    mutationFn: (items: GmailTransaction[]) =>
      gmailService.importTransactions(
        items.map(t => ({
          amount: t.amount,
          category_id: t.suggested_category_id || '',
          description: t.merchant,
          expense_date: t.date,
          payment_method: 'other',
        }))
      ),
    onSuccess: (data) => {
      setSnackbar({ open: true, message: `Successfully imported ${data.imported_count} expenses!`, severity: 'success' });
      setTransactions([]);
      setSelectedIds(new Set());
      setFetched(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Import failed', severity: 'error' });
    },
  });

  const handleConnect = async () => {
    try {
      const { auth_url } = await gmailService.getAuthUrl();
      window.open(auth_url, '_blank');
    } catch {
      setSnackbar({ open: true, message: 'Failed to get auth URL', severity: 'error' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await gmailService.disconnect();
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      setTransactions([]);
      setFetched(false);
    } catch {
      setSnackbar({ open: true, message: 'Failed to disconnect', severity: 'error' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const selectedItems = transactions.filter(t => selectedIds.has(t.id));

  if (statusLoading) {
    return (
      <Box>
        <PageHeader title="Gmail Import" />
        <Skeleton variant="rounded" height={300} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Gmail Import" icon="📧" />

      {/* Step 1: Connect */}
      {!status?.connected && (
        <Paper sx={{ p: 4, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
          <Typography variant="h3" mb={2}>📧</Typography>
          <Typography variant="h6" fontWeight={600} mb={1} sx={{ color: theme.palette.text.primary }}>
            Connect Gmail to Auto-Import Transactions
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14, mb: 3 }}>
            We read only bank transaction emails. We never read personal emails. Read-only access.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            {['🔒 Read-only access', '🏦 Bank emails only', '🚫 No personal emails', '🔐 Google secured'].map(badge => (
              <Chip key={badge} label={badge} sx={{ background: theme.palette.action.hover, color: theme.palette.text.secondary, borderRadius: '8px' }} />
            ))}
          </Box>
          <Button
            variant="contained"
            onClick={handleConnect}
            sx={{
              background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
              borderRadius: '12px',
              px: 4, py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Connect Gmail
          </Button>
        </Paper>
      )}

      {/* Step 2: Fetch */}
      {status?.connected && !fetched && (
        <Paper sx={{ p: 4, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', maxWidth: 520, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Chip label="Gmail Connected ✓" size="small" sx={{ background: '#00C9A720', color: '#00C9A7', fontWeight: 600 }} />
            <Button onClick={handleDisconnect} sx={{ color: theme.palette.text.secondary, textTransform: 'none', fontSize: 12, p: 0, minWidth: 'auto' }}>
              Disconnect
            </Button>
          </Box>

          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            Connected as {user?.email || 'your Google account'}
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <Select
              value={days}
              onChange={(e) => setDays(e.target.value as number)}
              sx={{ background: theme.palette.action.hover, color: theme.palette.text.primary, borderRadius: '10px' }}
            >
              {[7, 15, 30, 60].map(d => (
                <MenuItem key={d} value={d}>Last {d} days</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            fullWidth
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
            sx={{
              background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
              borderRadius: '12px',
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {fetchMutation.isPending ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} sx={{ color: '#fff' }} />
                Scanning your Gmail...
              </Box>
            ) : (
              '🔍 Fetch Bank Transactions'
            )}
          </Button>
        </Paper>
      )}

      {/* Step 3: Review */}
      {fetched && (
        <>
          <Paper sx={{ p: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', mb: 2 }}>
            <Grid container spacing={3}>
              {transactions.map((txn) => (
                <Grid item xs={12} key={txn.id}>
                  <Paper
                    sx={{
                      p: 2,
                      background: selectedIds.has(txn.id) ? '#00C9A710' : theme.palette.action.hover,
                      border: selectedIds.has(txn.id) ? '2px solid #00C9A7' : `1px solid ${theme.palette.divider}`,
                      borderRadius: '12px',
                      display: 'flex', alignItems: 'center', gap: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => toggleSelect(txn.id)}
                  >
                    <Checkbox checked={selectedIds.has(txn.id)} sx={{ color: theme.palette.text.secondary }} />
                    <Avatar sx={{ width: 36, height: 36, bgcolor: BANK_COLORS[txn.bank] || theme.palette.text.secondary, fontSize: 14, fontWeight: 700 }}>
                      {txn.bank[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: 14 }} noWrap>
                        {txn.merchant}
                      </Typography>
                      <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                        {txn.date} · {txn.bank}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{
                        fontWeight: 700, fontSize: 15,
                        color: txn.type === 'credit' ? '#00C9A7' : '#E24B4A',
                      }}>
                        {txn.type === 'credit' ? '+' : '-'}{' '}
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(txn.amount)}
                      </Typography>
                      {txn.suggested_category && (
                        <Chip
                          label={txn.suggested_category}
                          size="small"
                          sx={{ height: 20, fontSize: 10, background: '#00C9A720', color: '#00C9A7', mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Bottom action bar */}
          <Paper
            sx={{
              p: 2,
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', bottom: 80,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Checkbox
                checked={selectedIds.size === transactions.length && transactions.length > 0}
                indeterminate={selectedIds.size > 0 && selectedIds.size < transactions.length}
                onChange={toggleSelectAll}
                sx={{ color: theme.palette.text.secondary }}
              />
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 13 }}>
                {selectedIds.size} of {transactions.length} selected
              </Typography>
            </Box>
            <Button
              variant="contained"
              disabled={selectedIds.size === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate(selectedItems)}
              sx={{
                background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {importMutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : `Add ${selectedIds.size} Selected`}
            </Button>
          </Paper>
        </>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
