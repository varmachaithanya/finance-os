import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Fab,
  Drawer,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { expenseService } from '@/services/expenseService';
import { categoryService } from '@/services/categoryService';
import dayjs from 'dayjs';

const expenseSchema = z.object({
  amount: z.number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' }).positive('Amount must be positive'),
  category_id: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  expense_date: z.string().min(1, 'Date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseRow extends Record<string, unknown> {
  id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  category?: { id: string; name: string; color?: string; icon?: string };
  payment_method?: string;
}

const paymentMethods = ['cash', 'upi', 'card', 'netbanking', 'other'];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export default function Expenses() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [sortField, setSortField] = useState('expense_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => ({
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    category_id: filterCategory || undefined,
    payment_method: filterPayment || undefined,
    search: debouncedSearch || undefined,
    page: page + 1,
    limit,
    sort: sortField,
    order: sortDir as 'asc' | 'desc',
  }), [fromDate, toDate, filterCategory, filterPayment, debouncedSearch, page, limit, sortField, sortDir]);

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expenseService.list(filters),
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoryService.list('expense'),
  });

  const categories = (categoriesRaw as any)?.data ?? [];

  const rows: ExpenseRow[] = useMemo(() =>
    (expensesData?.data ?? []).map((e) => {
      const cat = categories.find((c: { id: string }) => c.id === e.category_id);
      return {
        ...e,
        payment_method: (e as unknown as Record<string, unknown>).payment_method as string ?? 'upi',
        category: cat ? { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } : undefined,
      };
    }), [expensesData, categories]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: undefined, category_id: '', description: '', expense_date: '', payment_method: '' },
  });

  const openAddDrawer = () => {
    setEditingId(null);
    setSuggestion(null);
    reset({ amount: undefined, category_id: '', description: '', expense_date: dayjs().format('YYYY-MM-DD'), payment_method: '' });
    setDrawerOpen(true);
  };

  const openEditDrawer = async (id: string) => {
    setEditingId(id);
    setSuggestion(null);
    try {
      const expense = await expenseService.get(id);
      reset({
        amount: expense.amount,
        category_id: expense.category_id ?? '',
        description: expense.description ?? '',
        expense_date: dayjs(expense.expense_date).format('YYYY-MM-DD'),
        payment_method: expense.payment_method ?? 'upi',
      });
      setDrawerOpen(true);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load expense', severity: 'error' });
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    setSuggestion(null);
  };

  const handleDescriptionBlur = async () => {
    const desc = watch('description');
    if (!desc || desc.length < 3) return;
    try {
      const result = await (expenseService as unknown as Record<string, (d: string) => Promise<string>>).aiSuggest?.(desc);
      if (result) setSuggestion(result);
    } catch {
      // silently ignore
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      expenseService.create({
        amount: data.amount,
        expense_date: data.expense_date,
        category_id: data.category_id,
        description: data.description,
        payment_method: data.payment_method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      closeDrawer();
      setSnackbar({ open: true, message: 'Expense created successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to create expense', severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) =>
      expenseService.update(id, {
        amount: data.amount,
        expense_date: data.expense_date,
        category_id: data.category_id,
        description: data.description,
        payment_method: data.payment_method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      closeDrawer();
      setSnackbar({ open: true, message: 'Expense updated successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update expense', severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDeleteId(null);
      setSnackbar({ open: true, message: 'Expense deleted successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to delete expense', severity: 'error' });
    },
  });

  const onSubmit = (formData: ExpenseFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDir(direction);
  };

  const columns = useMemo(() => [
    {
      id: 'date',
      label: 'Date',
      sortable: true,
      render: (row: ExpenseRow) => dayjs(row.date).format('DD MMM YYYY'),
    },
    {
      id: 'description',
      label: 'Description',
      sortable: true,
      render: (row: ExpenseRow) => row.description,
    },
    {
      id: 'category',
      label: 'Category',
      render: (row: ExpenseRow) => (
        <Chip
          label={row.category?.name ?? 'Uncategorized'}
          size="small"
          sx={{ bgcolor: row.category?.color ?? '#e0e0e0', color: row.category?.color ? '#fff' : undefined }}
        />
      ),
    },
    {
      id: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row: ExpenseRow) => (
        <Typography fontWeight={600} color="error.main">{fmtCurrency(row.amount)}</Typography>
      ),
    },
    {
      id: 'payment_method',
      label: 'Payment Method',
      render: (row: ExpenseRow) => (
        <Chip label={row.payment_method ?? 'upi'} size="small" variant="outlined" />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row: ExpenseRow) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => openEditDrawer(row.id)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleteId(row.id)}>
            <DeleteIcon fontSize="small" color="error" />
          </IconButton>
        </Stack>
      ),
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Expenses"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDrawer}>
            Add Expense
          </Button>
        }
      />

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <TextField fullWidth size="small" label="From" type="date" value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField fullWidth size="small" label="To" type="date" value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select value={filterCategory} label="Category" onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Payment</InputLabel>
            <Select value={filterPayment} label="Payment" onChange={(e) => { setFilterPayment(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {paymentMethods.map((m) => (
                <MenuItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <TextField fullWidth size="small" label="Search expenses..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </Grid>
      </Grid>

      <DataTable
        columns={columns}
        data={rows}
        total={expensesData?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSortChange={handleSortChange}
        loading={isLoading}
        emptyMessage="No expenses yet. Add your first expense!"
      />

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={openAddDrawer}>
        <AddIcon />
      </Fab>

      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer}>
        <Box sx={{ width: 400, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>{editingId ? 'Edit Expense' : 'Add Expense'}</Typography>
            <IconButton onClick={closeDrawer}><CloseIcon /></IconButton>
          </Box>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth label="Amount" type="number"
                {...register('amount', { valueAsNumber: true })}
                error={!!errors.amount}
                helperText={errors.amount?.message}
                InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>₹</Typography> }}
              />

              <FormControl fullWidth error={!!errors.category_id}>
                <InputLabel>Category</InputLabel>
              <Select {...register('category_id')} label="Category" MenuProps={{ disablePortal: true }}>
                <MenuItem value="">Select category</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {cat.color && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cat.color }} />}
                        {cat.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.category_id && <FormHelperText>{errors.category_id.message}</FormHelperText>}
              </FormControl>

              <TextField
                fullWidth label="Description" multiline rows={2}
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
                onBlur={handleDescriptionBlur}
              />

              {suggestion && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`Suggested: ${suggestion}`}
                    color="info"
                    size="small"
                    onDelete={() => setSuggestion(null)}
                  />
                </Box>
              )}

              <TextField
                fullWidth label="Date" type="date"
                {...register('expense_date')}
                error={!!errors.expense_date}
                helperText={errors.expense_date?.message}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth error={!!errors.payment_method}>
                <InputLabel>Payment Method</InputLabel>
                <Select {...register('payment_method')} label="Payment Method" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="">Select method</MenuItem>
                  {paymentMethods.map((m) => (
                    <MenuItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</MenuItem>
                  ))}
                </Select>
                {errors.payment_method && <FormHelperText>{errors.payment_method.message}</FormHelperText>}
              </FormControl>
            </Stack>

            <Button
              fullWidth variant="contained" size="large" type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              sx={{ mt: 3 }}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                editingId ? 'Update Expense' : 'Add Expense'
              )}
            </Button>
          </Box>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
