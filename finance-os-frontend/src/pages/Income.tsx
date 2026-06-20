import { useState } from 'react';
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
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { incomeService, type Income } from '@/services/incomeService';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const incomeSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  amount: z.coerce.number({ required_error: 'Amount is required', invalid_type_error: 'Must be a number' }).positive('Must be positive'),
  notes: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  is_recurring: z.boolean().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

const SOURCES = ['salary', 'freelancing', 'business', 'investment', 'other'];

const sourceLabel: Record<string, string> = {
  salary: 'Salary',
  freelancing: 'Freelancing',
  business: 'Business',
  investment: 'Investment',
  other: 'Other',
};

export default function Income() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const limit = 10;
  const [filters, setFilters] = useState({ source: '', startDate: '', endDate: '', search: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { source: '', amount: 0, notes: '', date: dayjs().format('YYYY-MM-DD'), is_recurring: false },
  });

  const queryFilters = {
    ...(filters.source && { source: filters.source }),
    ...(filters.startDate && { from_date: filters.startDate }),
    ...(filters.endDate && { to_date: filters.endDate }),
    ...(filters.search && { search: filters.search }),
    page: page + 1,
    limit,
  };

  const { data: incomeData, isLoading, isError } = useQuery({
    queryKey: ['incomes', queryFilters],
    queryFn: () => incomeService.list(queryFilters),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof incomeService.create>[0]) => incomeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setDrawerOpen(false);
      form.reset();
      showSnackbar('Income added successfully', 'success');
    },
    onError: () => showSnackbar('Failed to add income', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof incomeService.update>[1] }) =>
      incomeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setDrawerOpen(false);
      setEditingId(null);
      form.reset();
      showSnackbar('Income updated successfully', 'success');
    },
    onError: () => showSnackbar('Failed to update income', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setDeleteTarget(null);
      showSnackbar('Income deleted successfully', 'success');
    },
    onError: () => showSnackbar('Failed to delete income', 'error'),
  });

  const openAddDrawer = () => {
    setEditingId(null);
    form.reset({ source: '', amount: 0, notes: '', date: dayjs().format('YYYY-MM-DD'), is_recurring: false });
    setDrawerOpen(true);
  };

  const openEditDrawer = (income: Income) => {
    setEditingId(income.id);
    form.reset({
      source: income.source,
      amount: income.amount,
      notes: income.description || '',
      date: dayjs(income.income_date).format('YYYY-MM-DD'),
      is_recurring: income.is_recurring ?? false,
    });
    setDrawerOpen(true);
  };

  const onSubmit = (data: IncomeFormData) => {
    const payload = {
      amount: data.amount,
      source: data.source,
      income_date: data.date,
      description: data.notes || undefined,
      is_recurring: data.is_recurring ?? false,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Income>[] = [
    {
      id: 'income_date',
      label: 'Date',
      sortable: true,
      render: (row) => dayjs(row.income_date).format('DD MMM YYYY'),
    },
    {
      id: 'source',
      label: 'Source',
      render: (row) => (
        <Chip label={sourceLabel[row.source] || row.source} size="small" color="primary" variant="outlined" />
      ),
    },
    {
      id: 'description',
      label: 'Description',
      render: (row) => row.description || '-',
    },
    {
      id: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row) => (
        <Typography fontWeight={600} color="success.main">
          {formatCurrency(row.amount)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => openEditDrawer(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const data = incomeData?.data ?? [];
  const total = incomeData?.total ?? 0;

  return (
    <Box>
      <PageHeader
        title="Income"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDrawer}>
            Add Income
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Source</InputLabel>
          <Select
            value={filters.source}
            label="Source"
            onChange={(e) => { setFilters((f) => ({ ...f, source: e.target.value })); setPage(0); }}
          >
            <MenuItem value="">All</MenuItem>
            {SOURCES.map((s) => (
              <MenuItem key={s} value={s}>
                {sourceLabel[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{
          '& .MuiTextField-root': { width: '100%' },
          '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
          '& input': { padding: '10px 12px', fontSize: '13px' },
          maxWidth: 160,
        }}>
          <TextField
            size="small"
            type="date"
            label="From"
            value={filters.startDate}
            onChange={(e) => { setFilters((f) => ({ ...f, startDate: e.target.value })); setPage(0); }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
        <Box sx={{
          '& .MuiTextField-root': { width: '100%' },
          '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
          '& input': { padding: '10px 12px', fontSize: '13px' },
          maxWidth: 160,
        }}>
          <TextField
            size="small"
            type="date"
            label="To"
            value={filters.endDate}
            onChange={(e) => { setFilters((f) => ({ ...f, endDate: e.target.value })); setPage(0); }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {isError ? (
        <Alert severity="error">Failed to load incomes. Please try again.</Alert>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onSearchChange={(v) => { setFilters((f) => ({ ...f, search: v })); setPage(0); }}
          searchValue={filters.search}
          loading={isLoading}
          emptyMessage="No income recorded yet"
        />
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { if (!isPending) setDrawerOpen(false); }}
        PaperProps={{ sx: { width: 400, p: 3 } }}
      >
        <Typography variant="h6" fontWeight={600} mb={3}>
          {editingId ? 'Edit Income' : 'Add Income'}
        </Typography>
        <Box
          component="form"
          onSubmit={form.handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Controller
            name="source"
            control={form.control}
            render={({ field }) => (
              <FormControl fullWidth error={!!form.formState.errors.source}>
                <InputLabel>Source</InputLabel>
                <Select {...field} label="Source" MenuProps={{ disablePortal: true }}>
                  {SOURCES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {sourceLabel[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <TextField
            label="Amount"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            error={!!form.formState.errors.amount}
            helperText={form.formState.errors.amount?.message}
            {...form.register('amount', { valueAsNumber: true })}
          />

          <TextField
            label="Description"
            multiline
            rows={2}
            error={!!form.formState.errors.notes}
            helperText={form.formState.errors.notes?.message}
            {...form.register('notes')}
          />

          <Box sx={{
            '& .MuiTextField-root': { width: '100%' },
            '& input': { padding: '10px 12px', fontSize: '13px' },
          }}>
            <TextField
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!form.formState.errors.date}
              helperText={form.formState.errors.date?.message}
              {...form.register('date')}
            />
          </Box>

          <Controller
            name="is_recurring"
            control={form.control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value || false} onChange={field.onChange} />}
                label="Recurring"
              />
            )}
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
        title="Delete Income"
        message="Are you sure you want to delete this income entry? This action cannot be undone."
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
