import { useState } from 'react';
import {
  Box, Button, Chip, Drawer, IconButton, FormControl, InputLabel,
  Select, MenuItem, Switch, TextField, Typography, Grid, Skeleton,
  Alert, Tooltip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentsIcon from '@mui/icons-material/Payments';
import CategoryIcon from '@mui/icons-material/Category';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import StatCard from '@/components/common/StatCard';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { SubscriptionLogo } from '@/utils/logos';
import {
  subscriptionService,
  type Subscription,
  type UpcomingRenewalItem,
} from '@/services/subscriptionService';

dayjs.extend(relativeTime);

const formSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']),
  nextBillingDate: z.string().min(1, 'Renewal date is required'),
  autoRenewal: z.boolean().default(true),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const billingCycleLabel: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const SUBSCRIPTION_CATEGORIES = [
  { id: 'streaming', name: 'Streaming' },
  { id: 'music', name: 'Music' },
  { id: 'productivity', name: 'Productivity' },
  { id: 'cloud_storage', name: 'Cloud Storage' },
  { id: 'communication', name: 'Communication' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'news', name: 'News' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'education', name: 'Education' },
  { id: 'other', name: 'Other' },
];

const POPULAR_SERVICES = [
  'Netflix', 'Spotify', 'Amazon Prime', 'Disney+ Hotstar', 'YouTube Premium',
  'Google Drive', 'iCloud', 'Microsoft 365', 'Notion', 'Canva',
  'Jira', 'Slack', 'Zoom', 'LinkedIn Premium', 'Medium',
  'Cult.fit', 'Zomato Gold', 'Swiggy One',
];

const Subscriptions = () => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterCycle, setFilterCycle] = useState<string>('all');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', categoryId: '', amount: 0, billingCycle: 'monthly', nextBillingDate: '', autoRenewal: true, notes: '' },
  });

  const queryParams: Record<string, unknown> = {};
  if (filterActive !== 'all') queryParams.is_active = filterActive === 'active';
  if (filterCycle !== 'all') queryParams.billing_cycle = filterCycle;

  const { data: subscriptionsRaw, isLoading: subsLoading, isError: subsError } = useQuery({
    queryKey: ['subscriptions', queryParams],
    queryFn: () => subscriptionService.list(queryParams),
  });

  const { data: monthlyCost, isLoading: costLoading } = useQuery({
    queryKey: ['subscriptions', 'monthly-cost'],
    queryFn: () => subscriptionService.getMonthlyCost(),
  });

  const { data: upcomingRaw, isLoading: upcomingLoading } = useQuery({
    queryKey: ['subscriptions', 'upcoming', 30],
    queryFn: () => subscriptionService.getUpcoming(30),
  });

  const subscriptions = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : (subscriptionsRaw as any)?.data ?? [];
  const upcoming = Array.isArray(upcomingRaw) ? upcomingRaw : (upcomingRaw as any)?.data ?? [];

  const mapFormToApi = (data: FormValues) => ({
    service_name: data.name,
    amount: data.amount,
    billing_cycle: data.billingCycle,
    renewal_date: data.nextBillingDate,
    category: data.categoryId,
    auto_renewal: data.autoRenewal,
    notes: data.notes || undefined,
  });

  const createMut = useMutation({
    mutationFn: (data: FormValues) => subscriptionService.create(mapFormToApi(data)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'monthly-cost'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'upcoming'] }); handleCloseDrawer(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormValues }) =>
      subscriptionService.update(id, mapFormToApi(data)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'monthly-cost'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'upcoming'] }); handleCloseDrawer(); },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => subscriptionService.toggleActive(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'monthly-cost'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'upcoming'] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => subscriptionService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'monthly-cost'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions', 'upcoming'] }); setDeleteTarget(null); },
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    reset({ name: '', categoryId: '', amount: 0, billingCycle: 'monthly', nextBillingDate: '', autoRenewal: true, notes: '' });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    reset({
      name: sub.service_name,
      categoryId: sub.category ?? '',
      amount: sub.amount,
      billingCycle: sub.billing_cycle as 'monthly' | 'quarterly' | 'yearly',
      nextBillingDate: sub.renewal_date,
      autoRenewal: sub.auto_renewal ?? true,
      notes: sub.notes ?? '',
    });
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate(data);
    }
  };

  const daysRemaining = (date: string) => dayjs(date).diff(dayjs(), 'day');

  const columns: Column<Subscription>[] = [
    {
      id: 'service_name',
      label: 'Service Name',
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SubscriptionLogo service={row.service_name} />
          <Typography fontSize={14}>{row.service_name}</Typography>
        </Box>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      render: (row) => {
        const cat = SUBSCRIPTION_CATEGORIES.find(c => c.id === row.category);
        return cat ? (
          <Chip size="small" label={cat.name} />
        ) : '-';
      },
    },
    {
      id: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row) => INR(row.amount),
    },
    {
      id: 'billing_cycle',
      label: 'Billing Cycle',
      render: (row) => billingCycleLabel[row.billing_cycle] ?? row.billing_cycle,
    },
    {
      id: 'renewal_date',
      label: 'Renewal Date',
      render: (row) => {
        const days = daysRemaining(row.renewal_date);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{dayjs(row.renewal_date).format('DD MMM YYYY')}</span>
            <Chip
              size="small"
              label={days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
              color={days < 0 ? 'error' : days <= 7 ? 'warning' : 'default'}
            />
          </Box>
        );
      },
    },
    {
      id: 'auto_renewal',
      label: 'Auto Renewal',
      render: (row) => (
        <Tooltip title={row.auto_renewal ? 'Auto-renewal on' : 'Auto-renewal off'}>
          <IconButton size="small" color={row.auto_renewal ? 'success' : 'default'}>
            <AutorenewIcon />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      id: 'is_active',
      label: 'Active',
      render: (row) => (
        <Tooltip title={row.is_active ? 'Active' : 'Inactive'}>
          <IconButton size="small" onClick={() => toggleMut.mutate(row.id)} color={row.is_active ? 'success' : 'default'}>
            {row.is_active ? <CheckCircleIcon /> : <CancelIcon />}
          </IconButton>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleOpenEdit(row)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  const upcomingColumns: Column<UpcomingRenewalItem>[] = [
    {
      id: 'service_name',
      label: 'Service',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SubscriptionLogo service={row.service_name} />
          <Typography fontSize={14}>{row.service_name}</Typography>
        </Box>
      ),
    },
    { id: 'amount', label: 'Amount', render: (row) => INR(row.amount) },
    { id: 'renewal_date', label: 'Renewal Date', render: (row) => dayjs(row.renewal_date).format('DD MMM YYYY') },
    {
      id: 'days_remaining',
      label: 'Days Remaining',
      render: (row) => (
        <Chip size="small" label={`${row.days_remaining}d`} color={row.days_remaining <= 3 ? 'error' : row.days_remaining <= 7 ? 'warning' : 'default'} />
      ),
    },
  ];

  const isSubmitting = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add Subscription
          </Button>
        }
      />

      {costLoading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : monthlyCost ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Total Monthly Cost" value={monthlyCost.total_monthly_cost} icon={<PaymentsIcon />} color="#1976d2" />
          </Grid>
          {monthlyCost.by_category.slice(0, 2).map((bc) => (
            <Grid item xs={12} sm={6} md={4} key={bc.category}>
              <StatCard title={bc.category} value={bc.monthly_cost} icon={<CategoryIcon />} color="#388e3c" />
            </Grid>
          ))}
        </Grid>
      ) : null}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterActive} label="Status" onChange={(e) => setFilterActive(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="paused">Inactive</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Billing Cycle</InputLabel>
          <Select value={filterCycle} label="Billing Cycle" onChange={(e) => setFilterCycle(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {subsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>Failed to load subscriptions. Please try again.</Alert>
      ) : (
        <DataTable<Subscription>
          columns={columns}
          data={subscriptions}
          total={subscriptions.length}
          page={0}
          limit={50}
          onPageChange={() => {}}
          loading={subsLoading}
          emptyMessage="No subscriptions found"
        />
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight={600} gutterBottom>
        Upcoming Renewals <Typography variant="body2" component="span" color="text.secondary">(next 30 days)</Typography>
      </Typography>

      {upcomingLoading ? (
        <Skeleton variant="rounded" height={200} />
      ) : (
        <DataTable<UpcomingRenewalItem>
          columns={upcomingColumns}
          data={upcoming}
          total={upcoming.length}
          page={0}
          limit={50}
          onPageChange={() => {}}
          loading={false}
          emptyMessage="No upcoming renewals"
        />
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {editingId ? 'Edit Subscription' : 'Add Subscription'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <Controller name="name" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.name}>
                <InputLabel>Service Name</InputLabel>
                <Select {...field} label="Service Name" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="">Type or select...</MenuItem>
                  {POPULAR_SERVICES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )} />

            <Controller name="categoryId" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.categoryId}>
                <InputLabel>Category</InputLabel>
                <Select {...field} label="Category" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="">Select category</MenuItem>
                  {SUBSCRIPTION_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )} />

            <Controller name="amount" control={control} render={({ field }) => (
              <TextField {...field} label="Amount (₹)" type="number" error={!!errors.amount} helperText={errors.amount?.message} fullWidth />
            )} />

            <Controller name="billingCycle" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Billing Cycle</InputLabel>
                <Select {...field} label="Billing Cycle" MenuProps={{ disablePortal: true }}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            )} />

            <Controller name="nextBillingDate" control={control} render={({ field }) => (
              <Box sx={{
                '& .MuiTextField-root': { width: '100%' },
                '& input': { padding: '10px 12px', fontSize: '13px' },
              }}>
                <TextField {...field} label="Renewal Date" type="date" InputLabelProps={{ shrink: true }} error={!!errors.nextBillingDate} helperText={errors.nextBillingDate?.message} fullWidth />
              </Box>
            )} />

            <Controller name="autoRenewal" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Auto Renewal</Typography>
                  <Switch checked={field.value} onChange={field.onChange} />
                </Box>
              </FormControl>
            )} />

            <Controller name="notes" control={control} render={({ field }) => (
              <TextField {...field} label="Notes" multiline rows={3} fullWidth />
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
        title="Delete Subscription"
        message={`Are you sure you want to delete "${deleteTarget?.service_name}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default Subscriptions;
