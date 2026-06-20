import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Alert, Skeleton, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import StatCard from '@/components/common/StatCard';
import ExpensePieChart from '@/components/charts/ExpensePieChart';
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart';
import IncomeVsExpenseChart from '@/components/charts/IncomeVsExpenseChart';
import DebtProgressChart from '@/components/charts/DebtProgressChart';
import WelcomeModal from '@/components/common/WelcomeModal';
import { useAuthStore } from '@/app/store';
import { dashboardService } from '@/services/dashboardService';
import dayjs from 'dayjs';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const utilizationColor = (v: number): string => {
  if (v < 30) return '#4CAF50';
  if (v <= 60) return '#FFC107';
  return '#f44336';
};

const dotColor: Record<string, string> = {
  credit_card: '#f44336',
  subscription: '#2196F3',
  debt: '#FF9800',
  other: '#9E9E9E',
};

export default function Dashboard() {
  const [showWelcome, setShowWelcome] = useState(false);
  const user = useAuthStore((s) => s.user);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardService.getSummary(),
  });

  const chartsQuery = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: () => dashboardService.getCharts(6),
  });

  useEffect(() => {
    if (!summaryQuery.isLoading && !summaryQuery.error) {
      if (!sessionStorage.getItem('welcome_shown')) {
        setShowWelcome(true);
      }
    }
  });

  if (summaryQuery.isLoading || chartsQuery.isLoading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} mb={3}>Dashboard</Typography>
        <Grid container spacing={3} mb={4}>
          {[1,2,3,4,5,6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          {[1,2,3,4].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={350} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (summaryQuery.error) {
    return <Alert severity="error">{(summaryQuery.error as Error)?.message || 'Failed to load dashboard'}</Alert>;
  }

  const s = summaryQuery.data!;
  const c = chartsQuery.data!;
  const utilization = s.credit_card_utilization_avg ?? 0;

  const statCards = [
    { title: 'Total Income', value: s.total_income_month ?? 0, icon: <TrendingUpIcon />, color: '#4CAF50' },
    { title: 'Total Expenses', value: s.total_expenses_month ?? 0, icon: <ShoppingCartIcon />, color: '#f44336' },
    { title: 'Total Debt', value: s.total_debt ?? 0, icon: <CreditCardIcon />, color: '#FF9800' },
    { title: 'Remaining Balance', value: s.remaining_balance ?? 0, icon: <AccountBalanceWalletIcon />, color: '#2196F3' },
    { title: 'Monthly Savings', value: s.monthly_savings ?? 0, icon: <SavingsIcon />, color: '#4CAF50' },
    { title: 'Credit Utilization', value: utilization, icon: <AssessmentIcon />, color: utilizationColor(utilization), subtitle: `${utilization.toFixed(1)}%` },
  ];

  const expensePieData = (c.expense_by_category ?? []).map(e => ({
    name: e.category,
    value: Number(e.amount),
    color: e.color ?? '#1976d2',
  }));

  const monthlyTrendData = (c.monthly_trend ?? []).map(e => ({ month: e.month, amount: Number(e.expenses) }));

  const incomeVsExpenseData = (c.income_vs_expense ?? []).map(e => ({
    month: e.month, income: Number(e.income), expenses: Number(e.expenses),
  }));

  const debtProgressData = (c.debt_reduction ?? []).map(e => ({ month: e.month, total_debt: Number(e.total_debt) }));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Dashboard</Typography>

      <Grid container spacing={3} mb={4}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <StatCard title={card.title} value={card.value} icon={card.icon} color={card.color} subtitle={'subtitle' in card ? card.subtitle : undefined} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <ExpensePieChart data={expensePieData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <MonthlyTrendChart data={monthlyTrendData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <IncomeVsExpenseChart data={incomeVsExpenseData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DebtProgressChart data={debtProgressData} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>Upcoming Due Payments</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Due Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(s.upcoming_dues ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No upcoming dues</TableCell>
                    </TableRow>
                  ) : (
                    (s.upcoming_dues ?? []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dotColor[row.type] ?? '#9E9E9E' }} />
                            <Typography variant="body2" textTransform="capitalize">{row.type.replace('_', ' ')}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{fmt(row.amount)}</TableCell>
                        <TableCell>{dayjs(row.due_date).format('DD MMM YYYY')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>Upcoming Renewals</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Renewal Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(s.upcoming_renewals ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>No upcoming renewals</TableCell>
                    </TableRow>
                  ) : (
                    (s.upcoming_renewals ?? []).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.service_name}</TableCell>
                        <TableCell align="right">{fmt(row.amount)}</TableCell>
                        <TableCell>{dayjs(row.renewal_date).format('DD MMM YYYY')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      <WelcomeModal
        open={showWelcome}
        onClose={() => { setShowWelcome(false); sessionStorage.setItem('welcome_shown', 'true'); }}
        userName={user?.full_name || 'User'}
        totalExpenses={s.total_expenses_month}
        totalIncome={s.total_income_month}
        alerts={s.budget_alerts?.length}
      />
    </Box>
  );
}
