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
  Chip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Skeleton,
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
  Payment as PaymentIcon,
  MoneyOff as MoneyOffIcon,
} from '@mui/icons-material';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { debtService, type Debt } from '@/services/debtService';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const debtSchema = z.object({
  name: z.string().min(1, 'Lender name is required'),
  category: z.string().min(1, 'Debt type is required'),
  totalAmount: z.coerce.number({ required_error: 'Total amount is required' }).positive('Must be positive'),
  paidAmount: z.coerce.number({ required_error: 'Paid amount is required' }).min(0, 'Cannot be negative'),
  interestRate: z.coerce.number({ required_error: 'Interest rate is required' }).min(0, 'Cannot be negative'),
  minimumPayment: z.coerce.number({ required_error: 'EMI amount is required' }).positive('Must be positive'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
});

type DebtFormData = z.infer<typeof debtSchema>;

const paymentSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'Amount is required', invalid_type_error: 'Must be a number' })
    .positive('Must be positive'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const DEBT_TYPES = [
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'credit_card_debt', label: 'Credit Card Debt' },
  { value: 'borrowed_money', label: 'Borrowed Money' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

function getDebtStatus(debt: Debt): 'paid' | 'active' | 'overdue' {
  if (debt.remainingAmount <= 0) return 'paid';
  if (dayjs(debt.dueDate).isBefore(dayjs(), 'day')) return 'overdue';
  return 'active';
}

const statusConfig: Record<string, { color: 'success' | 'warning' | 'error'; label: string }> = {
  paid: { color: 'success', label: 'Paid' },
  active: { color: 'warning', label: 'Active' },
  overdue: { color: 'error', label: 'Overdue' },
};

function getDaysRemaining(dueDate: string): number {
  return dayjs(dueDate).diff(dayjs(), 'day');
}

interface PayoffPlanItem {
  name: string;
  remaining: number;
  interestRate: number;
  estimatedMonths: number;
  monthlyPayment: number;
}

function computePayoffPlan(debts: Debt[], strategy: 'snowball' | 'avalanche'): PayoffPlanItem[] {
  const active = debts.filter((d) => d.remainingAmount > 0);
  const sorted = [...active].sort((a, b) => {
    if (strategy === 'avalanche') return b.interestRate - a.interestRate;
    return a.remainingAmount - b.remainingAmount;
  });

  return sorted.map((d) => {
    const monthly = d.minimumPayment > 0 ? d.minimumPayment : d.remainingAmount * 0.02;
    const monthlyRate = d.interestRate / 100 / 12;
    let months = 0;
    let balance = d.remainingAmount;
    if (monthlyRate > 0 && monthly > balance * monthlyRate) {
      months = Math.ceil(Math.log(monthly / (monthly - balance * monthlyRate)) / Math.log(1 + monthlyRate));
    } else if (monthlyRate <= 0 && monthly > 0) {
      months = Math.ceil(balance / monthly);
    } else {
      months = 999;
    }
    return {
      name: d.name,
      remaining: d.remainingAmount,
      interestRate: d.interestRate,
      estimatedMonths: months,
      monthlyPayment: monthly,
    };
  });
}

export default function Debts() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Debt | null>(null);
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [payoffStrategy, setPayoffStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const form = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      name: '',
      category: '',
      totalAmount: 0,
      paidAmount: 0,
      interestRate: 0,
      minimumPayment: 0,
      dueDate: '',
      notes: '',
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0 },
  });

  const { data: debts, isLoading, isError } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof debtService.create>[0]) => debtService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setDrawerOpen(false);
      form.reset();
      showSnackbar('Debt added successfully', 'success');
    },
    onError: () => showSnackbar('Failed to add debt', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof debtService.update>[1] }) =>
      debtService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setDrawerOpen(false);
      setEditingId(null);
      form.reset();
      showSnackbar('Debt updated successfully', 'success');
    },
    onError: () => showSnackbar('Failed to update debt', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => debtService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setDeleteTarget(null);
      showSnackbar('Debt deleted successfully', 'success');
    },
    onError: () => showSnackbar('Failed to delete debt', 'error'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, paidAmount }: { id: string; paidAmount: number }) =>
      debtService.update(id, { paidAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setPaymentTarget(null);
      paymentForm.reset();
      showSnackbar('Payment recorded successfully', 'success');
    },
    onError: () => showSnackbar('Failed to record payment', 'error'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isPaymentPending = recordPaymentMutation.isPending;

  const debtList = (debts as any)?.data ?? [];

  const filteredDebts = useMemo(
    () =>
      debtList.filter((d) => {
        if (filters.category && d.category !== filters.category) return false;
        if (filters.status) {
          const status = getDebtStatus(d);
          if (status !== filters.status) return false;
        }
        return true;
      }),
    [debtList, filters],
  );

  const summary = useMemo(() => {
    const totalOwed = debtList.reduce((s, d) => s + d.remainingAmount, 0);
    const totalPaid = debtList.reduce((s, d) => s + d.paidAmount, 0);
    const activeDebts = debtList.filter((d) => d.remainingAmount > 0).length;
    return { totalOwed, totalPaid, activeDebts, total: debtList.length };
  }, [debtList]);

  const payoffPlan = useMemo(() => computePayoffPlan(filteredDebts, payoffStrategy), [filteredDebts, payoffStrategy]);

  const openAddDrawer = () => {
    setEditingId(null);
    form.reset({
      name: '',
      category: '',
      totalAmount: 0,
      paidAmount: 0,
      interestRate: 0,
      minimumPayment: 0,
      dueDate: '',
      notes: '',
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (debt: Debt) => {
    setEditingId(debt.id);
    form.reset({
      name: debt.lender_name,
      category: debt.debt_type || '',
      totalAmount: debt.total_amount,
      paidAmount: debt.paid_amount,
      interestRate: debt.interest_rate ?? 0,
      minimumPayment: debt.emi_amount ?? 0,
      dueDate: debt.due_date ? dayjs(debt.due_date).format('YYYY-MM-DD') : '',
      notes: debt.notes || '',
    });
    setDrawerOpen(true);
  };

  const onSubmit = (data: DebtFormData) => {
    const payload = {
      lender_name: data.name,
      debt_type: data.category || 'other',
      total_amount: data.totalAmount,
      paid_amount: data.paidAmount,
      emi_amount: data.minimumPayment,
      interest_rate: data.interestRate,
      due_date: data.dueDate || undefined,
      notes: data.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onRecordPayment = (data: PaymentFormData) => {
    if (!paymentTarget) return;
    const newPaid = paymentTarget.paidAmount + data.amount;
    recordPaymentMutation.mutate({ id: paymentTarget.id, paidAmount: newPaid });
  };

  const openPaymentModal = (debt: Debt) => {
    setPaymentTarget(debt);
    const maxPayment = debt.remainingAmount;
    paymentForm.reset({ amount: 0 });
  };

  const renderSkeletons = () =>
    Array.from({ length: 4 }, (_, i) => (
      <Grid item xs={12} key={i}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Skeleton variant="text" width="30%" height={28} />
              <Skeleton variant="rounded" width={80} height={24} />
            </Box>
            <Skeleton variant="rounded" height={10} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="50%" />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Skeleton variant="rounded" width={100} height={24} />
              <Skeleton variant="rounded" width={100} height={24} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ));

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Owed"
            value={summary.totalOwed}
            icon={<MoneyOffIcon />}
            color="#ed6c02"
            subtitle={`Across ${summary.activeDebts} active debts`}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Paid"
            value={summary.totalPaid}
            icon={<PaymentIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Active Debts"
            value={summary.activeDebts}
            icon={<MoneyOffIcon />}
            color="#1976d2"
            subtitle={summary.total > 0 ? `${summary.total - summary.activeDebts} paid off` : undefined}
          />
        </Grid>
      </Grid>

      <PageHeader
        title="Debts"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDrawer}>
            Add Debt
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Debt Type</InputLabel>
          <Select
            value={filters.category}
            label="Debt Type"
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <MenuItem value="">All</MenuItem>
            {DEBT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isError ? (
        <Alert severity="error">Failed to load debts. Please try again.</Alert>
      ) : isLoading ? (
        <Grid container spacing={2}>
          {renderSkeletons()}
        </Grid>
      ) : filteredDebts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <MoneyOffIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={1}>
            No debts found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {debtList.length === 0
              ? 'Start by adding your first debt.'
              : 'No debts match the current filters.'}
          </Typography>
          {debtList.length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDrawer}>
              Add Debt
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} mb={4}>
          {filteredDebts.map((debt) => {
            const status = getDebtStatus(debt);
            const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
            const daysRemaining = getDaysRemaining(debt.dueDate);
            const sc = statusConfig[status];
            return (
              <Grid item xs={12} key={debt.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {debt.name}
                        </Typography>
                        {debt.category && (
                          <Chip label={debt.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                      <Chip label={sc.label} size="small" color={sc.color} />
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(debt.paidAmount)} paid of {formatCurrency(debt.totalAmount)} total
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        color={status === 'paid' ? 'success' : 'primary'}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>

                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          EMI Amount
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(debt.minimumPayment)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Interest Rate
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {debt.interestRate}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Due Date
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {dayjs(debt.dueDate).format('DD MMM YYYY')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Days Remaining
                        </Typography>
                        <Chip
                          label={daysRemaining <= 0 ? 'Overdue' : `${daysRemaining} days`}
                          size="small"
                          color={daysRemaining <= 7 ? 'error' : daysRemaining <= 30 ? 'warning' : 'default'}
                          sx={{ height: 22, fontSize: 12 }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5, gap: 0.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PaymentIcon />}
                      onClick={() => openPaymentModal(debt)}
                      disabled={status === 'paid'}
                    >
                      Record Payment
                    </Button>
                    <IconButton size="small" onClick={() => openEditDrawer(debt)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(debt)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {payoffPlan.length > 0 && (
        <Box mb={4}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Payoff Plan
            </Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Strategy</InputLabel>
              <Select
                value={payoffStrategy}
                label="Strategy"
                onChange={(e) => setPayoffStrategy(e.target.value as 'snowball' | 'avalanche')}
              >
                <MenuItem value="avalanche">Avalanche (Highest Interest)</MenuItem>
                <MenuItem value="snowball">Snowball (Lowest Balance)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lender</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                  <TableCell align="right">Interest Rate</TableCell>
                  <TableCell align="right">Est. Months</TableCell>
                  <TableCell align="right">Monthly Payment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payoffPlan.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{formatCurrency(item.remaining)}</TableCell>
                    <TableCell align="right">{item.interestRate}%</TableCell>
                    <TableCell align="right">
                      {item.estimatedMonths >= 999 ? '>' : ''}{item.estimatedMonths >= 999 ? 999 : item.estimatedMonths}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.monthlyPayment)}</TableCell>
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
          {editingId ? 'Edit Debt' : 'Add Debt'}
        </Typography>
        <Box
          component="form"
          onSubmit={form.handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            label="Lender Name"
            error={!!form.formState.errors.name}
            helperText={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <Controller
            name="category"
            control={form.control}
            render={({ field }) => (
              <FormControl fullWidth error={!!form.formState.errors.category}>
                <InputLabel>Debt Type</InputLabel>
                <Select {...field} label="Debt Type" MenuProps={{ disablePortal: true }}>
                  {DEBT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <TextField
            label="Total Amount"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.totalAmount}
            helperText={form.formState.errors.totalAmount?.message}
            {...form.register('totalAmount', { valueAsNumber: true })}
          />

          <TextField
            label="Paid Amount"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.paidAmount}
            helperText={form.formState.errors.paidAmount?.message}
            {...form.register('paidAmount', { valueAsNumber: true })}
          />

          <TextField
            label="EMI Amount"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.minimumPayment}
            helperText={form.formState.errors.minimumPayment?.message}
            {...form.register('minimumPayment', { valueAsNumber: true })}
          />

          <TextField
            label="Interest Rate (%)"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.interestRate}
            helperText={form.formState.errors.interestRate?.message}
            {...form.register('interestRate', { valueAsNumber: true })}
          />

          <TextField
            label="Due Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            error={!!form.formState.errors.dueDate}
            helperText={form.formState.errors.dueDate?.message}
            {...form.register('dueDate')}
          />

          <TextField
            label="Notes"
            multiline
            rows={2}
            error={!!form.formState.errors.notes}
            helperText={form.formState.errors.notes?.message}
            {...form.register('notes')}
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

      <Dialog open={!!paymentTarget} onClose={() => { if (!isPaymentPending) { setPaymentTarget(null); paymentForm.reset(); } }} maxWidth="xs" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <Box component="form" onSubmit={paymentForm.handleSubmit(onRecordPayment)}>
          <DialogContent>
            {paymentTarget && (
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {paymentTarget.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Remaining: <strong>{formatCurrency(paymentTarget.remainingAmount)}</strong>
                </Typography>
              </Box>
            )}
            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              inputProps={{ min: 0, step: 0.01, max: paymentTarget?.remainingAmount ?? 0 }}
              error={!!paymentForm.formState.errors.amount}
              helperText={paymentForm.formState.errors.amount?.message || `Max: ${formatCurrency(paymentTarget?.remainingAmount ?? 0)}`}
              {...paymentForm.register('amount', { valueAsNumber: true })}
              autoFocus
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setPaymentTarget(null); paymentForm.reset(); }} disabled={isPaymentPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isPaymentPending}>
              {isPaymentPending ? <CircularProgress size={20} color="inherit" /> : 'Record Payment'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Debt"
        message="Are you sure you want to delete this debt entry? This action cannot be undone."
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
