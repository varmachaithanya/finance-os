import { useState } from 'react';
import { Box, Paper, Typography, Slider, TextField, Grid, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import AmortizationChart from '@/components/charts/AmortizationChart';
import { aiService, EMIResponse } from '@/services/aiService';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function EMICalculator() {
  const theme = useTheme();
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(10);
  const [tenureYears, setTenureYears] = useState(3);
  const [result, setResult] = useState<EMIResponse | null>(null);

  const calcMutation = useMutation({
    mutationFn: () => aiService.calculateEMI({
      loan_amount: loanAmount,
      interest_rate: interestRate,
      tenure_months: tenureYears * 12,
    }),
    onSuccess: setResult,
  });

  const handleAddToDebts = () => {
    window.open('/debts?add=1&amount=' + loanAmount + '&rate=' + interestRate, '_self');
  };

  return (
    <Box>
      <PageHeader title="EMI Calculator" icon="🧮" />

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography fontWeight={600} fontSize={16} mb={3}>Loan Details</Typography>

            <Box mb={3}>
              <Typography fontSize={13} color="text.secondary" mb={1}>Loan Amount: ₹{loanAmount.toLocaleString('en-IN')}</Typography>
              <Slider value={loanAmount} onChange={(_, v) => setLoanAmount(v as number)} min={10000} max={10000000} step={10000}
                sx={{ color: theme.palette.primary.main }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={11} color="text.secondary">₹10K</Typography>
                <Typography fontSize={11} color="text.secondary">₹1Cr</Typography>
              </Box>
            </Box>

            <Box mb={3}>
              <Typography fontSize={13} color="text.secondary" mb={1}>Interest Rate: {interestRate}%</Typography>
              <Slider value={interestRate} onChange={(_, v) => setInterestRate(v as number)} min={1} max={30} step={0.5}
                sx={{ color: '#F59E0B' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={11} color="text.secondary">1%</Typography>
                <Typography fontSize={11} color="text.secondary">30%</Typography>
              </Box>
            </Box>

            <Box mb={3}>
              <Typography fontSize={13} color="text.secondary" mb={1}>Tenure: {tenureYears} years ({tenureYears * 12} months)</Typography>
              <Slider value={tenureYears} onChange={(_, v) => setTenureYears(v as number)} min={1} max={30} step={1}
                sx={{ color: '#0EA5E9' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={11} color="text.secondary">1 year</Typography>
                <Typography fontSize={11} color="text.secondary">30 years</Typography>
              </Box>
            </Box>

            <Button fullWidth variant="contained" onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending}
              sx={{ borderRadius: '12px', py: 1.5, textTransform: 'none', fontWeight: 600,
                background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)' }}>
              Calculate EMI
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          {result && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Typography fontSize={11} color="text.secondary">Monthly EMI</Typography>
                    <Typography fontSize={22} fontWeight={700} color="primary.main">{fmtCurrency(result.monthly_emi)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Typography fontSize={11} color="text.secondary">Total Interest</Typography>
                    <Typography fontSize={22} fontWeight={700} color="#F59E0B">{fmtCurrency(result.total_interest)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '14px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Typography fontSize={11} color="text.secondary">Total Payment</Typography>
                    <Typography fontSize={22} fontWeight={700} color="#E24B4A">{fmtCurrency(result.total_payment)}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2.5, borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <AmortizationChart principal={result.principal_percentage} interest={result.interest_percentage} />
              </Paper>

              <Button variant="outlined" onClick={handleAddToDebts}
                sx={{ borderRadius: '12px', textTransform: 'none', borderColor: '#00C9A7', color: '#00C9A7' }}>
                + Add to Debt Tracker
              </Button>

              <Paper sx={{ borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography fontWeight={600} fontSize={14} p={2} pb={0}>Amortization Schedule</Typography>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Month</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>EMI</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Principal</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Interest</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.amortization_schedule.map(row => (
                        <TableRow key={row.month}>
                          <TableCell sx={{ fontSize: 11 }}>{row.month}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.emi)}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.principal)}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.interest)}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{fmtCurrency(row.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {!result && (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px', background: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography fontSize={48}>🧮</Typography>
              <Typography color="text.secondary" mt={2}>Adjust the sliders and click Calculate EMI</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
