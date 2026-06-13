import { useState } from 'react';
import {
  Box, Button, Card, CardContent, CardActions, Typography, Grid,
  Drawer, TextField, FormControl, InputLabel, Select, MenuItem,
  Skeleton, Alert, LinearProgress, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AlertBanner from '@/components/common/AlertBanner';
import {
  budgetService,
  type Budget,
} from '@/services/budgetService';
import { categoryService } from '@/services/categoryService';

const formSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  budgetAmount: z.coerce.number().positive('Budget must be positive'),
  period: z.enum(['monthly']),
  month: z.coerce.number().min(1, 'Invalid month').max(12, 'Invalid month'),
  year: z.coerce.number().min(2020, 'Invalid year').max(2100, 'Invalid year'),
});

type FormValues = z.infer<typeof formSchema>;

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const percentColor = (pct: number) => {
  if (pct > 100) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
};

const Budgets = () => {
  const queryClient = useQueryClient();
  const now = dayjs();
  const [month, setMonth] = useState<number>(now.month() + 1);
  const [year, setYear] = useState<number>(now.year());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { categoryId: '', budgetAmount: 0, period: 'monthly', month, year },
  });

  const { data: budgetsRaw, isLoading: budgetsLoading, isError: budgetsError } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => budgetService.list(month, year),
  });

  const { data: vsActualRaw, isLoading: vsActualLoading } = useQuery({
    queryKey: ['budgets', 'vs-actual', month, year],
    queryFn: () => budgetService.getVsActual(month, year),
  });

  const { data: alertsRaw, isLoading: alertsLoading } = useQuery({
    queryKey: ['budgets', 'alerts', month, year],
    queryFn: () => budgetService.getAlerts(month, year),
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoryService.list('expense'),
  });

  const budgets = (budgetsRaw as any)?.data ?? [];
  const vsActual = (vsActualRaw as any)?.data ?? [];
  const alerts = (alertsRaw as any)?.data ?? [];
  const categories = (categoriesRaw as any)?.data ?? [];

  const createMut = useMutation({
    mutationFn: (data: FormValues) =>
      budgetService.create({
        category_id: data.categoryId,
        budget_amount: data.budgetAmount,
        period: data.period,
        month: data.month,
        year: data.year,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); queryClient.invalidateQueries({ queryKey: ['budgets', 'vs-actual'] }); queryClient.invalidateQueries({ queryKey: ['budgets', 'alerts'] }); handleCloseDrawer(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormValues }) =>
      budgetService.update(id, {
        budget_amount: data.budgetAmount,
        period: data.period,
        month: data.month,
        year: data.year,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); queryClient.invalidateQueries({ queryKey: ['budgets', 'vs-actual'] }); queryClient.invalidateQueries({ queryKey: ['budgets', 'alerts'] }); handleCloseDrawer(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => budgetService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); queryClient.invalidateQueries({ queryKey: ['budgets', 'vs-actual'] }); queryClient.invalidateQueries({ queryKey: ['budgets', 'alerts'] }); setDeleteTarget(null); },
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    reset({ categoryId: '', budgetAmount: 0, period: 'monthly', month, year });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingId(budget.id);
    reset({
      categoryId: budget.category_id ?? '',
      budgetAmount: budget.budget_amount,
      period: budget.period,
      month: budget.month ?? month,
      year: budget.year ?? year,
    });
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => { setDrawerOpen(false); setEditingId(null); };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate(data);
    }
  };

  const isSubmitting = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          label="Month"
          type="month"
          size="small"
          value={dayjs().year(year).month(month - 1).format('YYYY-MM')}
          onChange={(e) => {
            const d = dayjs(e.target.value);
            setMonth(d.month() + 1);
            setYear(d.year());
          }}
          sx={{ width: 200 }}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <PageHeader
        title="Budgets"
        subtitle={`${dayjs().month(month - 1).format('MMMM')} ${year}`}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Set Budget
          </Button>
        }
      />

      {alerts && alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {alerts.map((alert, idx) => (
            <AlertBanner
              key={idx}
              type="budget_alert"
              title={alert.category_name}
              message={`Budget of ${INR(alert.budget)} exceeded ${Math.round(alert.pct_used)}%`}
            />
          ))}
        </Box>
      )}

      {budgetsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>Failed to load budgets. Please try again.</Alert>
      ) : budgetsLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : !budgets || budgets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No budgets set for this month
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a budget to track your spending and stay on top of your finances.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Set Budget
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {budgets.map((budget) => {
            const cat = categories.find(c => c.id === budget.category_id);
            const pct = 0;
            return (
              <Grid item xs={12} sm={6} lg={4} key={budget.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: 4, borderColor: 'primary.main' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: cat?.color ?? '#1976d2' }} />
                      <Typography variant="h6" fontWeight={600}>
                        {cat?.name ?? budget.category_id}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Budget</Typography>
                      <Typography variant="body1" fontWeight={600}>{INR(budget.budget_amount)}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color="success"
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                    <IconButton size="small" onClick={() => handleOpenEdit(budget)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(budget)}><DeleteIcon fontSize="small" /></IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
        Budget vs Actual
      </Typography>

      {vsActualLoading ? (
        <Skeleton variant="rounded" height={200} />
      ) : !vsActual || vsActual.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>No comparison data available for this period.</Alert>
      ) : (
        <Box sx={{ overflowX: 'auto', mb: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Category', 'Budget', 'Spent', 'Remaining', '% Used'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid', borderColor: 'divider', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vsActual.map((row) => {
                const pct = row.budget > 0 ? Math.min((row.spent / row.budget) * 100, 100) : 0;
                return (
                  <tr key={row.category_id}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={500}>{row.category_name}</Typography>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>{INR(row.budget)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>{INR(row.spent)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>{INR(Math.max(row.remaining, 0))}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid', borderColor: 'divider', minWidth: 160 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={pct} color={percentColor(pct)} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" fontWeight={600} color={`${percentColor(pct)}.main`}>{Math.round(row.pct_used)}%</Typography>
                      </Box>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {editingId ? 'Edit Budget' : 'Set Budget'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.categoryId}>
                <InputLabel>Category</InputLabel>
                <Select {...field} label="Category" MenuProps={{ disablePortal: true }}>
                  {categories?.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )} />

            <Controller name="budgetAmount" control={control} render={({ field }) => (
              <TextField {...field} label="Budget Amount (₹)" type="number" error={!!errors.budgetAmount} helperText={errors.budgetAmount?.message} fullWidth />
            )} />

            <Controller name="period" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select {...field} label="Period" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            )} />

            <Controller name="month" control={control} render={({ field }) => (
              <TextField {...field} label="Month" type="number" inputProps={{ min: 1, max: 12 }} error={!!errors.month} helperText={errors.month?.message} fullWidth />
            )} />

            <Controller name="year" control={control} render={({ field }) => (
              <TextField {...field} label="Year" type="number" inputProps={{ min: 2020, max: 2100 }} error={!!errors.year} helperText={errors.year?.message} fullWidth />
            )} />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
              <Button variant="outlined" onClick={handleCloseDrawer}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Budget"
        message={`Are you sure you want to delete the budget for "${categories.find(c => c.id === deleteTarget?.category_id)?.name ?? deleteTarget?.category_id}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default Budgets;
