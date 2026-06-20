import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Drawer,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Skeleton,
  Snackbar,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CreditCard as CreditCardIcon,
} from '@mui/icons-material';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { creditCardService, type CreditCard, type Utilization } from '@/services/creditCardService';
import { BankLogo, CardNetworkBadge } from '@/utils/logos';

const formatAmount = (value: any): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

const safeNumber = (value: any): number => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const BANK_NAMES = [
  'HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra',
  'Yes Bank', 'RBL Bank', 'IndusInd Bank', 'American Express',
  'Standard Chartered', 'Citi Bank', 'AU Bank', 'IDFC First Bank',
  'Federal Bank', 'HSBC', 'Other',
];

const CARD_TYPES = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'American Express' },
  { value: 'diners', label: 'Diners Club' },
  { value: 'other', label: 'Other' },
];

const creditCardSchema = z.object({
  issuer: z.string().min(1, 'Bank name is required'),
  name: z.string().min(1, 'Card name is required'),
  cardType: z.string().optional(),
  lastFourDigits: z
    .string()
    .length(4, 'Must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Must be 4 digits')
    .optional()
    .or(z.literal('')),
  limit: z.coerce.number({ required_error: 'Credit limit is required' }).positive('Must be positive'),
  balance: z.coerce.number({ required_error: 'Outstanding balance is required' }).min(0, 'Cannot be negative'),
  dueDate: z.string().min(1, 'Due date is required'),
  statementDate: z.string().min(1, 'Statement date is required'),
  apr: z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Cannot be negative').optional(),
});

type CreditCardFormData = z.infer<typeof creditCardSchema>;

function getUtilizationColor(percent: number): string {
  if (percent < 30) return 'success';
  if (percent <= 60) return 'warning';
  return 'error';
}

function getUtilizationHex(percent: number): string {
  if (percent < 30) return '#2e7d32';
  if (percent <= 60) return '#ed6c02';
  return '#d32f2f';
}

function getDaysRemaining(dueDate: string): number {
  return dayjs(dueDate).diff(dayjs(), 'day');
}

function getUtilizationStatus(util: Utilization): { color: string; label: string; chipColor: 'success' | 'warning' | 'error' } {
  const pct = util.utilization_pct;
  if (pct < 30) return { color: '#2e7d32', label: 'Low', chipColor: 'success' };
  if (pct <= 60) return { color: '#ed6c02', label: 'Moderate', chipColor: 'warning' };
  return { color: '#d32f2f', label: 'High', chipColor: 'error' };
}

interface DueAlert {
  cardName: string;
  dueDate: string;
  daysRemaining: number;
  minimumDue: number;
}

function computeDueAlerts(cards: CreditCard[], minPaymentPercent = 0.05): DueAlert[] {
  return cards
    .map((c) => {
      const bal = safeNumber(c.outstanding_balance) > 0 ? safeNumber(c.outstanding_balance) : 0;
      return {
        cardName: c.card_name,
        dueDate: c.due_date,
        daysRemaining: getDaysRemaining(c.due_date),
        minimumDue: bal * minPaymentPercent,
      };
    })
    .filter((a) => a.daysRemaining <= 30);
}

export default function CreditCards() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const form = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      issuer: '',
      name: '',
      cardType: '',
      lastFourDigits: '',
      limit: 0,
      balance: 0,
      dueDate: '',
      statementDate: '',
      apr: 0,
    },
  });

  const { data: cards, isLoading: cardsLoading, isError: cardsError } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => creditCardService.list(),
  });

  const { data: utilization, isLoading: utilLoading } = useQuery({
    queryKey: ['creditCards', 'utilization'],
    queryFn: () => creditCardService.getUtilization(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof creditCardService.create>[0]) => creditCardService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      queryClient.invalidateQueries({ queryKey: ['creditCards', 'utilization'] });
      setDrawerOpen(false);
      form.reset();
      showSnackbar('Card added successfully', 'success');
    },
    onError: () => showSnackbar('Failed to add card', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof creditCardService.update>[1] }) =>
      creditCardService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      queryClient.invalidateQueries({ queryKey: ['creditCards', 'utilization'] });
      setDrawerOpen(false);
      setEditingId(null);
      form.reset();
      showSnackbar('Card updated successfully', 'success');
    },
    onError: () => showSnackbar('Failed to update card', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creditCardService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      queryClient.invalidateQueries({ queryKey: ['creditCards', 'utilization'] });
      setDeleteTarget(null);
      showSnackbar('Card deleted successfully', 'success');
    },
    onError: () => showSnackbar('Failed to delete card', 'error'),
  });

  const openAddDrawer = () => {
    setEditingId(null);
    form.reset({
      issuer: '',
      name: '',
      cardType: '',
      lastFourDigits: '',
      limit: 0,
      balance: 0,
      dueDate: '',
      statementDate: '',
      apr: 0,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (card: CreditCard) => {
    setEditingId(card.id);
    form.reset({
      issuer: card.bank_name,
      name: card.card_name,
      cardType: '',
      lastFourDigits: card.last_four_digits || '',
      limit: card.credit_limit,
      balance: card.outstanding_balance,
      dueDate: card.due_date ? dayjs(card.due_date).format('YYYY-MM-DD') : '',
      statementDate: '',
      apr: 0,
    });
    setDrawerOpen(true);
  };

  const onSubmit = (data: CreditCardFormData) => {
    const payload = {
      bank_name: data.issuer,
      card_name: data.name,
      credit_limit: data.limit,
      outstanding_balance: data.balance,
      last_four_digits: data.lastFourDigits || undefined,
      due_date: data.dueDate || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const cardList = Array.isArray(cards) ? cards : (cards as any)?.data ?? [];
  const utilList = Array.isArray(utilization) ? utilization : (utilization as any)?.data ?? [];

  const dueAlerts = useMemo(() => computeDueAlerts(cardList), [cardList]);

  const avgUtilization = cardList?.length > 0
    ? cardList.reduce((sum: number, card: any) => {
        const util = safeNumber(card.credit_limit) > 0
          ? (safeNumber(card.outstanding_balance) / safeNumber(card.credit_limit)) * 100
          : 0;
        return sum + util;
      }, 0) / cardList.length
    : 0;

  const renderSkeletons = () =>
    Array.from({ length: 6 }, (_, i) => (
      <Grid item xs={12} sm={6} md={4} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={28} />
            <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="rounded" height={8} sx={{ my: 1.5 }} />
            <Skeleton variant="text" width="50%" />
          </CardContent>
        </Card>
      </Grid>
    ));

  return (
    <Box>
      <PageHeader
        title="Credit Cards"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDrawer}>
            Add Card
          </Button>
        }
      />

      {utilList.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Utilization Summary
          </Typography>
          <Grid container spacing={2} mb={4}>
            {utilList.map((util) => {
              const status = getUtilizationStatus(util);
              return (
                <Grid item xs={12} sm={6} md={4} key={util.card_id}>
                  <Card sx={{ borderLeft: `4px solid ${status.color}`, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {util.card_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(util.utilization_pct, 100)}
                            color={status.chipColor}
                            sx={{ height: 10, borderRadius: 5 }}
                          />
                        </Box>
                        <Chip label={`${Math.round(util.utilization_pct)}%`} size="small" color={status.chipColor} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {cardsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>Failed to load credit cards. Please try again.</Alert>
      ) : cardsLoading ? (
        <Grid container spacing={2}>
          {renderSkeletons()}
        </Grid>
      ) : cardList.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CreditCardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={1}>
            No credit cards added yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Add your first credit card to track spending and utilization.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDrawer}>
            Add Card
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {cardList.map((card: any) => {
            const creditLimit = safeNumber(card.credit_limit);
            const outstanding = safeNumber(card.outstanding_balance);
            const utilizationPercent = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
            const daysRemaining = getDaysRemaining(card.due_date);
            return (
              <Grid item xs={12} sm={6} md={4} key={card.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BankLogo bankName={card.bank_name} />
                        <Box>
                          <Typography variant="h6" fontWeight={600} lineHeight={1.3}>
                            {card.bank_name || 'Bank'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {card.card_name}
                            </Typography>
                            <CardNetworkBadge cardName={card.card_name} />
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    <Typography variant="body1" fontFamily="monospace" letterSpacing={2} mb={2}>
                      {'\u2022\u2022\u2022\u2022'} {card.last_four_digits || '0000'}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Credit Limit
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {'\u20B9'}{formatAmount(creditLimit)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Outstanding
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color={outstanding > 0 ? 'error.main' : 'success.main'}>
                        {'\u20B9'}{formatAmount(outstanding)}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Utilization
                        </Typography>
                        <Chip
                          label={`${Math.round(utilizationPercent)}%`}
                          size="small"
                          color={getUtilizationColor(utilizationPercent)}
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(utilizationPercent, 100)}
                        color={getUtilizationColor(utilizationPercent)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={daysRemaining <= 0 ? 'Overdue' : `${daysRemaining} days remaining`}
                        size="small"
                        color={daysRemaining <= 3 ? 'error' : 'default'}
                        variant={daysRemaining <= 3 ? 'filled' : 'outlined'}
                      />
                      <Chip
                        label={`Due: ${dayjs(card.due_date).format('DD MMM')}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
                    <IconButton size="small" onClick={() => openEditDrawer(card)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(card)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {dueAlerts.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Due Alerts
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Card</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Days Remaining</TableCell>
                  <TableCell align="right">Minimum Due</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dueAlerts.map((alert) => (
                  <TableRow key={alert.cardName}>
                    <TableCell>{alert.cardName}</TableCell>
                    <TableCell>{dayjs(alert.dueDate).format('DD MMM YYYY')}</TableCell>
                    <TableCell>
                      <Chip
                        label={alert.daysRemaining <= 0 ? 'Overdue' : `${alert.daysRemaining} days`}
                        size="small"
                        color={alert.daysRemaining <= 3 ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(alert.minimumDue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { if (!isPending) setDrawerOpen(false); }}
        PaperProps={{ sx: { width: 400, p: 3 } }}
      >
        <Typography variant="h6" fontWeight={600} mb={3}>
          {editingId ? 'Edit Card' : 'Add Card'}
        </Typography>
        <Box
          component="form"
          onSubmit={form.handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Controller
            name="issuer"
            control={form.control}
            render={({ field }) => (
              <FormControl fullWidth error={!!form.formState.errors.issuer}>
                <InputLabel>Bank Name</InputLabel>
                <Select {...field} label="Bank Name" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="">Select bank</MenuItem>
                  {BANK_NAMES.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <TextField
            label="Card Name"
            error={!!form.formState.errors.name}
            helperText={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <Controller
            name="cardType"
            control={form.control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Card Type</InputLabel>
                <Select {...field} label="Card Type" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="">Select type</MenuItem>
                  {CARD_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <TextField
            label="Last 4 Digits"
            inputProps={{ maxLength: 4 }}
            error={!!form.formState.errors.lastFourDigits}
            helperText={form.formState.errors.lastFourDigits?.message}
            {...form.register('lastFourDigits')}
          />

          <TextField
            label="Credit Limit"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.limit}
            helperText={form.formState.errors.limit?.message}
            {...form.register('limit', { valueAsNumber: true })}
          />

          <TextField
            label="Outstanding Balance"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.balance}
            helperText={form.formState.errors.balance?.message}
            {...form.register('balance', { valueAsNumber: true })}
          />

          <Box sx={{
            '& .MuiTextField-root': { width: '100%' },
            '& input': { padding: '10px 12px', fontSize: '13px' },
          }}>
            <TextField
              label="Due Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!form.formState.errors.dueDate}
              helperText={form.formState.errors.dueDate?.message}
              {...form.register('dueDate')}
            />
          </Box>

          <Box sx={{
            '& .MuiTextField-root': { width: '100%' },
            '& input': { padding: '10px 12px', fontSize: '13px' },
          }}>
            <TextField
              label="Statement Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!form.formState.errors.statementDate}
              helperText={form.formState.errors.statementDate?.message}
              {...form.register('statementDate')}
            />
          </Box>

          <TextField
            label="APR (%)"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.apr}
            helperText={form.formState.errors.apr?.message}
            {...form.register('apr', { valueAsNumber: true })}
          />

          <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
            <Button variant="contained" type="submit" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : editingId ? 'Update' : 'Add'}
            </Button>
            <Button variant="outlined" onClick={() => setDrawerOpen(false)} disabled={isPending}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Card"
        message="Are you sure you want to delete this credit card? This action cannot be undone."
        confirmText="Delete"
        severity="error"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
