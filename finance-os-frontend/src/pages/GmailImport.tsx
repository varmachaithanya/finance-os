import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Paper, Typography, Button, Chip, Checkbox, Grid, Avatar, MenuItem, TextField,
  Snackbar, Alert, CircularProgress, Skeleton, Select, FormControl, useTheme,
} from '@mui/material';
import PageHeader from '@/components/common/PageHeader';
import { gmailService, GmailTransaction, FetchTransactionsResponse } from '@/services/gmailService';
import { useAuthStore } from '@/app/store';

const BANK_COLORS: Record<string, string> = {
  'HDFC Bank': '#004c8f',
  'ICICI Bank': '#F47920',
  'State Bank of India': '#1a5276',
  'Axis Bank': '#97144D',
  'Kotak Mahindra Bank': '#EF4123',
  'IndusInd Bank': '#E31837',
  'Yes Bank': '#0033A0',
  'IDFC First Bank': '#9B1B30',
  'Federal Bank': '#00529B',
  'RBL Bank': '#CC0000',
  'Paytm Payments Bank': '#00B9F1',
};

const BANK_SHORTS: Record<string, string> = {
  'HDFC Bank': 'HDFC',
  'ICICI Bank': 'ICICI',
  'State Bank of India': 'SBI',
  'Axis Bank': 'AXIS',
  'Kotak Mahindra Bank': 'KMB',
  'IndusInd Bank': 'IIB',
  'Yes Bank': 'YES',
  'IDFC First Bank': 'IDFC',
  'Federal Bank': 'FED',
  'RBL Bank': 'RBL',
  'Paytm Payments Bank': 'PTM',
};

const EXPENSE_CATEGORIES = [
  'Food', 'Travel', 'Fuel', 'Shopping',
  'Medical', 'Entertainment', 'Utilities',
  'OTT Subscriptions', 'Mobile Recharge', 'Other'
];

const getBankColor = (bank: string) => BANK_COLORS[bank] || '#4A6080';
const getBankShort = (bank: string) => BANK_SHORTS[bank] || bank.charAt(0).toUpperCase();

export default function GmailImport() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState(30);
  const [fetchMode, setFetchMode] = useState<'incremental' | 'all'>('incremental');
  const [transactions, setTransactions] = useState<GmailTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchTransactionsResponse | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => gmailService.getStatus(),
  });

  const fetchMutation = useMutation({
    mutationFn: () => gmailService.fetchTransactions({
      days: fetchMode === 'all' ? days : 7,
      incremental: fetchMode === 'incremental',
    }),
    onSuccess: (data) => {
      setTransactions(data.transactions.map(t => ({ ...t, selected: false })));
      setSelectedIds(new Set());
      setFetched(true);
      setFetchResult(data);
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
          description: t.merchant,
          expense_date: t.date,
          suggested_category: t.suggested_category || 'Other',
          payment_method: 'upi',
        }))
      ),
    onSuccess: (data) => {
      setSnackbar({ open: true, message: `Successfully imported ${data.imported_count} expenses!`, severity: 'success' });
      setTransactions([]);
      setSelectedIds(new Set());
      setFetched(false);
      setFetchResult(null);
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
      setFetchResult(null);
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

  const updateCategory = (id: string, category: string) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, suggested_category: category } : t
    ));
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

          {/* Fetch mode toggle */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label="🔄 Fetch New Only"
              onClick={() => setFetchMode('incremental')}
              variant={fetchMode === 'incremental' ? 'filled' : 'outlined'}
              sx={{
                background: fetchMode === 'incremental' ? '#00C9A720' : 'transparent',
                color: fetchMode === 'incremental' ? '#00C9A7' : '#4A6080',
                border: '1px solid',
                borderColor: fetchMode === 'incremental' ? '#00C9A7' : '#1E2D45',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            />
            <Chip
              label="📥 Fetch All"
              onClick={() => setFetchMode('all')}
              variant={fetchMode === 'all' ? 'filled' : 'outlined'}
              sx={{
                background: fetchMode === 'all' ? '#0EA5E920' : 'transparent',
                color: fetchMode === 'all' ? '#0EA5E9' : '#4A6080',
                border: '1px solid',
                borderColor: fetchMode === 'all' ? '#0EA5E9' : '#1E2D45',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            />
          </Box>

          {fetchMode === 'all' && (
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
          )}

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
              fetchMode === 'incremental' ? '🔄 Fetch New Transactions' : '🔍 Fetch Bank Transactions'
            )}
          </Button>
        </Paper>
      )}

      {/* Step 3: Review */}
      {fetched && (
        <>
          {/* Fetch info bar */}
          {fetchResult && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography fontSize={13} color="#4A6080">
                {fetchResult.is_incremental
                  ? 'Showing new transactions since last fetch'
                  : `Showing transactions from last ${fetchResult.days_searched} days`}
              </Typography>
              {fetchResult.last_fetch_was && (
                <Typography fontSize={11} color="#4A6080">
                  Last fetched: {new Date(fetchResult.last_fetch_was).toLocaleString('en-IN')}
                </Typography>
              )}
            </Box>
          )}

          {/* Empty state */}
          {transactions.length === 0 && !fetchMutation.isPending && (
            <Box sx={{ textAlign: 'center', py: 6, background: '#111E33', border: '1px solid #1E2D45', borderRadius: '16px' }}>
              <Typography fontSize={40} mb={2}>✅</Typography>
              <Typography fontSize={16} fontWeight={600} color="#F0F6FF" mb={1}>
                {fetchResult?.is_incremental ? 'All caught up!' : 'No bank transactions found'}
              </Typography>
              <Typography fontSize={13} color="#4A6080">
                {fetchResult?.is_incremental
                  ? 'No new bank transactions since your last fetch.'
                  : `No bank transaction emails found in the last ${fetchResult?.days_searched || days} days.`}
              </Typography>
              {fetchResult?.is_incremental && (
                <Chip
                  label="📥 Fetch All (30 days)"
                  onClick={() => {
                    setFetchMode('all');
                    setTimeout(() => fetchMutation.mutate(), 100);
                  }}
                  sx={{ mt: 2, background: '#0EA5E920', color: '#0EA5E9', border: '1px solid #0EA5E930', cursor: 'pointer' }}
                />
              )}
            </Box>
          )}

          {/* Transaction rows */}
          {transactions.length > 0 && (
            <Paper sx={{ p: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', mb: 2 }}>
              <Grid container spacing={1.5}>
                {transactions.map((txn) => (
                  <Grid item xs={12} key={txn.id}>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        p: 2,
                        background: selectedIds.has(txn.id) ? '#00C9A710' : '#111E33',
                        border: '1px solid',
                        borderColor: selectedIds.has(txn.id) ? '#00C9A730' : '#1E2D45',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: selectedIds.has(txn.id) ? '#00C9A7' : '#2E3D55' },
                      }}
                      onClick={() => toggleSelect(txn.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(txn.id)}
                        sx={{ color: '#4A6080', '&.Mui-checked': { color: '#00C9A7' } }}
                      />

                      <Avatar sx={{
                        width: 40, height: 40,
                        bgcolor: getBankColor(txn.bank),
                        fontSize: '12px', fontWeight: 700,
                        borderRadius: '10px', flexShrink: 0,
                      }}>
                        {getBankShort(txn.bank)}
                      </Avatar>

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography fontSize={14} fontWeight={600} color="#F0F6FF" noWrap>
                          {txn.merchant || 'Bank Transaction'}
                        </Typography>
                        <Typography fontSize={12} color="#4A6080">
                          {txn.bank} · {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                        {txn.raw_snippet && (
                          <Typography fontSize={11} color="#4A6080" noWrap sx={{ mt: 0.25 }}>
                            {txn.raw_snippet}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography fontSize={15} fontWeight={700} color={txn.type === 'credit' ? '#00C9A7' : '#E24B4A'}>
                          {txn.type === 'credit' ? '+ ' : '- '}₹{Number(txn.amount).toLocaleString('en-IN')}
                        </Typography>
                        <Select
                          size="small"
                          value={txn.suggested_category || 'Other'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateCategory(txn.id, e.target.value)}
                          sx={{
                            fontSize: '11px', color: '#00C9A7', mt: 0.5, minWidth: 120,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00C9A730' },
                            '& .MuiSelect-select': { py: '2px', px: '8px' },
                          }}
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <MenuItem key={cat} value={cat} sx={{ fontSize: '12px' }}>{cat}</MenuItem>
                          ))}
                        </Select>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Bottom action bar */}
          {transactions.length > 0 && (
            <Paper sx={{
              p: 2,
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', bottom: 80,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Checkbox
                  checked={selectedIds.size === transactions.length && transactions.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < transactions.length}
                  onChange={toggleSelectAll}
                  sx={{ color: '#4A6080', '&.Mui-checked': { color: '#00C9A7' } }}
                />
                <Typography sx={{ color: '#4A6080', fontSize: 13 }}>
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
          )}
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
