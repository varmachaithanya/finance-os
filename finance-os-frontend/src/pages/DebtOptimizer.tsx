import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Tabs, Tab, Chip, Skeleton, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, TextField, Grid } from '@mui/material';
import PageHeader from '@/components/common/PageHeader';
import DebtPayoffChart from '@/components/charts/DebtPayoffChart';
import { aiService } from '@/services/aiService';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function DebtOptimizer() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [monthlyBudget, setMonthlyBudget] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'debt-plan', monthlyBudget],
    queryFn: () => aiService.getDebtPayoffPlan(monthlyBudget),
  });

  const plan = tab === 0 ? data?.snowball : data?.avalanche;

  return (
    <Box>
      <PageHeader title="Debt Payoff Optimizer" icon="🎯" />

      {isLoading && <Skeleton variant="rounded" height={300} />}

      {data && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField label="Monthly Budget" type="number" size="small"
              value={monthlyBudget} onChange={e => setMonthlyBudget(Number(e.target.value))}
              sx={{ width: 200 }} InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>₹</Typography> }} />
            <Chip label={`Best: ${data.best_strategy}`} size="small" sx={{ background: '#10B98120', color: '#10B981', fontWeight: 600, textTransform: 'capitalize' }} />
            <Chip label={`Save ₹${data.interest_saved.toLocaleString('en-IN')}`} size="small" sx={{ background: '#F59E0B20', color: '#F59E0B', fontWeight: 600 }} />
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography fontSize={11} color="text.secondary">Snowball Months</Typography>
                <Typography fontSize={22} fontWeight={700} color="#F59E0B">{data.snowball.months_to_debt_free}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography fontSize={11} color="text.secondary">Snowball Interest</Typography>
                <Typography fontSize={22} fontWeight={700} color="#F59E0B">{fmtCurrency(data.snowball.total_interest_paid)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography fontSize={11} color="text.secondary">Avalanche Months</Typography>
                <Typography fontSize={22} fontWeight={700} color="#10B981">{data.avalanche.months_to_debt_free}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography fontSize={11} color="text.secondary">Avalanche Interest</Typography>
                <Typography fontSize={22} fontWeight={700} color="#10B981">{fmtCurrency(data.avalanche.total_interest_paid)}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2.5, mb: 3, borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <DebtPayoffChart snowball={data.snowball} avalanche={data.avalanche} />
          </Paper>

          <Paper sx={{ borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label={`Snowball (${data.snowball.months_to_debt_free} mo)`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
              <Tab label={`Avalanche (${data.avalanche.months_to_debt_free} mo)`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
            </Tabs>
            {plan && (
              <TableContainer sx={{ maxHeight: 450 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Month</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Payment</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Principal</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Interest</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plan.schedule.map(row => (
                      <TableRow key={row.month}>
                        <TableCell sx={{ fontSize: 11 }}>{row.month}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.payment)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.principal)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.interest)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {!isLoading && !data && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography fontSize={40}>🎯</Typography>
          <Typography color="text.secondary" mt={1}>No active debts found. Add debts first.</Typography>
        </Paper>
      )}
    </Box>
  );
}
