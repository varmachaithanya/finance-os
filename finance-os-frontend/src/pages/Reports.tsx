import { useState } from 'react';
import {
  Box, Button, Typography, Grid, Card, CardContent, ToggleButtonGroup,
  ToggleButton, TextField, Skeleton, Alert, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Divider,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SavingsIcon from '@mui/icons-material/Savings';
import { useMutation } from '@tanstack/react-query';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

import PageHeader from '@/components/common/PageHeader';
import { reportService, type ReportPreviewData } from '@/services/reportService';

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

const Reports = () => {
  const now = dayjs();
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [month, setMonth] = useState<number>(now.month() + 1);
  const [year, setYear] = useState<number>(now.year());
  const [week, setWeek] = useState<number>(now.isoWeek());
  const [day, setDay] = useState<string>(now.format('YYYY-MM-DD'));

  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);

  const generateMut = useMutation({
    mutationFn: () => {
      const params: Record<string, unknown> = { period, year };
      if (period === 'monthly') params.month = month;
      else if (period === 'weekly') params.week = week;
      else if (period === 'daily') params.date = day;
      return reportService.generate(params);
    },
    onSuccess: (data) => setPreviewData(data),
  });

  const exportPdfMut = useMutation({
    mutationFn: () => {
      const params: Record<string, unknown> = { period, year };
      if (period === 'monthly') params.month = month;
      else if (period === 'weekly') params.week = week;
      else if (period === 'daily') params.date = day;
      return reportService.exportReport('pdf', params);
    },
    onSuccess: (data) => saveAs(data.blob, data.filename),
  });

  const exportExcelMut = useMutation({
    mutationFn: () => {
      const params: Record<string, unknown> = { period, year };
      if (period === 'monthly') params.month = month;
      else if (period === 'weekly') params.week = week;
      else if (period === 'daily') params.date = day;
      return reportService.exportReport('xlsx', params);
    },
    onSuccess: (data) => saveAs(data.blob, data.filename),
  });

  const exportCsvMut = useMutation({
    mutationFn: () => {
      const params: Record<string, unknown> = { period, year };
      if (period === 'monthly') params.month = month;
      else if (period === 'weekly') params.week = week;
      else if (period === 'daily') params.date = day;
      return reportService.exportReport('csv', params);
    },
    onSuccess: (data) => saveAs(data.blob, data.filename),
  });

  const handlePeriodChange = (_: unknown, val: PeriodType | null) => {
    if (val) setPeriod(val);
  };

  const handleGenerate = () => generateMut.mutate();

  const isExporting = exportPdfMut.isPending || exportExcelMut.isPending || exportCsvMut.isPending;

  return (
    <Box>
      <PageHeader title="Reports" />

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="yearly">Yearly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        {period === 'monthly' && (
          <Box sx={{
            '& .MuiTextField-root': { width: '100%' },
            '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
            '& input': { padding: '10px 12px', fontSize: '13px' },
          }}>
            <TextField
              label="Month"
              type="month"
              size="small"
              value={dayjs().year(year).month(month - 1).format('YYYY-MM')}
              onChange={(e) => { const d = dayjs(e.target.value); setMonth(d.month() + 1); setYear(d.year()); }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
          </Box>
        )}
        {period === 'yearly' && (
          <Box sx={{
            '& .MuiTextField-root': { width: '100%' },
            '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
            '& input': { padding: '10px 12px', fontSize: '13px' },
          }}>
            <TextField
              label="Year"
              type="number"
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              inputProps={{ min: 2020, max: 2100 }}
              sx={{ width: 120 }}
            />
          </Box>
        )}
        {period === 'weekly' && (
          <>
            <Box sx={{
              '& .MuiTextField-root': { width: '100%' },
              '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
              '& input': { padding: '10px 12px', fontSize: '13px' },
            }}>
              <TextField
                label="Year"
                type="number"
                size="small"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{
              '& .MuiTextField-root': { width: '100%' },
              '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
              '& input': { padding: '10px 12px', fontSize: '13px' },
            }}>
              <TextField
                label="Week Number"
                type="number"
                size="small"
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                inputProps={{ min: 1, max: 53 }}
                sx={{ width: 120 }}
              />
            </Box>
          </>
        )}
        {period === 'daily' && (
          <Box sx={{
            '& .MuiTextField-root': { width: '100%' },
            '& .MuiInputBase-root': { width: '100%', fontSize: '13px' },
            '& input': { padding: '10px 12px', fontSize: '13px' },
          }}>
            <TextField
              label="Date"
              type="date"
              size="small"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
          </Box>
        )}

        <Button variant="contained" onClick={handleGenerate} disabled={generateMut.isPending}>
          {generateMut.isPending ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>

      {generateMut.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to generate report. Please try again.
        </Alert>
      )}

      {generateMut.isPending && (
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={200} />
        </Box>
      )}

      {previewData && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Period</Typography>
                  <Typography variant="h6" fontWeight={600}>{previewData.period}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {period === 'daily' ? day : period === 'weekly' ? `Week ${week}, ${year}` : period === 'monthly' ? `${dayjs().month(month - 1).format('MMMM')} ${year}` : `${year}`}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Total Income</Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">{INR(previewData.totalIncome)}</Typography>
                    </Box>
                    <TrendingUpIcon color="success" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Total Expenses</Typography>
                      <Typography variant="h5" fontWeight={700} color="error.main">{INR(previewData.totalExpenses)}</Typography>
                    </Box>
                    <TrendingDownIcon color="error" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mb: 3, borderLeft: 4, borderColor: previewData.netSavings >= 0 ? 'success.main' : 'error.main' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>Net Savings</Typography>
                <Typography variant="h4" fontWeight={700} color={previewData.netSavings >= 0 ? 'success.main' : 'error.main'}>
                  {INR(previewData.netSavings)}
                </Typography>
              </Box>
              <SavingsIcon sx={{ fontSize: 48, color: previewData.netSavings >= 0 ? 'success.main' : 'error.main' }} />
            </CardContent>
          </Card>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Expenses <Typography variant="body2" component="span" color="text.secondary">(top 20)</Typography>
              </Typography>
              {previewData.expenses.length === 0 ? (
                <Alert severity="info">No expenses in this period.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.expenses.slice(0, 20).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Chip size="small" label={item.category} variant="outlined" />
                          </TableCell>
                          <TableCell>{dayjs(item.date).format('DD MMM YYYY')}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{INR(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Income <Typography variant="body2" component="span" color="text.secondary">(top 20)</Typography>
              </Typography>
              {previewData.income.length === 0 ? (
                <Alert severity="info">No income in this period.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.income.slice(0, 20).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Chip size="small" label={item.category} variant="outlined" />
                          </TableCell>
                          <TableCell>{dayjs(item.date).format('DD MMM YYYY')}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>{INR(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" fontWeight={600} gutterBottom>
            Export Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Download this report in your preferred format.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={exportPdfMut.isPending ? <Skeleton variant="circular" width={20} height={20} /> : <PictureAsPdfIcon />}
              onClick={() => exportPdfMut.mutate()}
              disabled={exportPdfMut.isPending || isExporting}
            >
              {exportPdfMut.isPending ? 'Downloading...' : 'Export PDF'}
            </Button>
            <Button
              variant="outlined"
              startIcon={exportExcelMut.isPending ? <Skeleton variant="circular" width={20} height={20} /> : <TableChartIcon />}
              onClick={() => exportExcelMut.mutate()}
              disabled={exportExcelMut.isPending || isExporting}
            >
              {exportExcelMut.isPending ? 'Downloading...' : 'Export Excel'}
            </Button>
            <Button
              variant="outlined"
              startIcon={exportCsvMut.isPending ? <Skeleton variant="circular" width={20} height={20} /> : <DescriptionIcon />}
              onClick={() => exportCsvMut.mutate()}
              disabled={exportCsvMut.isPending || isExporting}
            >
              {exportCsvMut.isPending ? 'Downloading...' : 'Export CSV'}
            </Button>
          </Box>
        </>
      )}

      {!generateMut.isPending && !previewData && !generateMut.isError && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No report generated yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a period and click "Generate Report" to view your financial summary.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Reports;
