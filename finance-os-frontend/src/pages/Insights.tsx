import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Grid, Skeleton, Chip } from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { insightsService } from '@/services/insightsService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const insightBorder: Record<string, string> = {
  positive: '2px solid #00C9A7',
  warning: '2px solid #F59E0B',
  danger: '2px solid #E24B4A',
  info: '2px solid #0EA5E9',
  tip: '2px solid #8B5CF6',
};

const insightBg: Record<string, string> = {
  positive: '#00C9A710',
  warning: '#F59E0B10',
  danger: '#E24B4A10',
  info: '#0EA5E910',
  tip: '#8B5CF610',
};

const savingsColor = (rate: number) => {
  if (rate >= 30) return '#00C9A7';
  if (rate >= 20) return '#F59E0B';
  return '#E24B4A';
};

function CircularGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1E2D45" strokeWidth={8} />
        <circle
          cx="50" cy="50" r={r}
          fill="none" stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="52" textAnchor="middle" fill={color} fontSize="20" fontWeight={700}>
          {value.toFixed(0)}%
        </text>
      </svg>
      <Typography sx={{ color: '#4A6080', fontSize: 12, mt: 1 }}>{label}</Typography>
    </Box>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <Box sx={{ background: '#111E33', border: '1px solid #1E2D45', borderRadius: '12px', p: 2 }}>
      <Typography sx={{ color: '#4A6080', fontSize: 12, mb: 1 }}>{label}</Typography>
      {payload.map((entry: any, i: number) => (
        <Typography key={i} sx={{ color: entry.color || '#F0F6FF', fontSize: 13, fontWeight: 600 }}>
          {entry.name}: {fmt(entry.value)}
        </Typography>
      ))}
    </Box>
  );
}

export default function Insights() {
  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsService.getSummary(),
  });

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} mb={3}>AI Spending Insights</Typography>
        <Grid container spacing={3}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data) return null;

  const { insights } = data;

  return (
    <Box>
      <PageHeader title="AI Spending Insights" icon="🤖" />

      {/* Top stat cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, background: '#111E33', border: '1px solid #1E2D45', borderRadius: '16px', display: 'flex', justifyContent: 'center' }}>
            <CircularGauge value={data.savings_rate} color={savingsColor(data.savings_rate)} label="Savings Rate" />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Income" value={data.total_income} icon="💰" color="#00C9A7" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Expenses" value={data.total_expenses} icon="💸" color="#E24B4A" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Top Spending Day" value={data.top_spending_day} icon="📅" color="#F59E0B" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, background: '#111E33', border: '1px solid #1E2D45', borderRadius: '16px' }}>
            <Typography variant="h6" fontWeight={600} mb={3}>Category Breakdown</Typography>
            {data.categories.slice(0, 5).map((cat) => (
              <Box key={cat.name} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                    <Typography sx={{ color: '#F0F6FF', fontSize: 14 }}>{cat.name}</Typography>
                  </Box>
                  <Typography sx={{ color: '#4A6080', fontSize: 13 }}>{cat.percentage.toFixed(1)}%</Typography>
                </Box>
                <Box sx={{ background: '#0B1120', borderRadius: 8, height: 8, mb: 0.5, overflow: 'hidden' }}>
                  <Box sx={{ width: `${Math.min(cat.percentage, 100)}%`, background: cat.color, height: 8, borderRadius: 8 }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#4A6080', fontSize: 12 }}>{fmt(cat.amount)}</Typography>
                  <Chip
                    label={`${cat.change_pct > 0 ? '+' : ''}${cat.change_pct.toFixed(0)}% vs last month`}
                    size="small"
                    sx={{
                      height: 20, fontSize: 10,
                      background: cat.trend === 'up' ? '#E24B4A20' : '#00C9A720',
                      color: cat.trend === 'up' ? '#E24B4A' : '#00C9A7',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Monthly Trend Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, background: '#111E33', border: '1px solid #1E2D45', borderRadius: '16px' }}>
            <Typography variant="h6" fontWeight={600} mb={3}>6 Month Trend</Typography>
            {data.monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.monthly_trend}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C9A7" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00C9A7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E24B4A" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#E24B4A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1E2D45" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: '#4A6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: '#4A6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#00C9A7" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="#E24B4A" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: '#4A6080', textAlign: 'center', py: 4 }}>No data available</Typography>
            )}
          </Paper>
        </Grid>

        {/* Monthly Savings BarChart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, background: '#111E33', border: '1px solid #1E2D45', borderRadius: '16px' }}>
            <Typography variant="h6" fontWeight={600} mb={3}>Monthly Savings</Typography>
            {data.monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthly_trend}>
                  <CartesianGrid stroke="#1E2D45" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: '#4A6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: '#4A6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="savings" name="Savings" radius={[6, 6, 0, 0]}>
                    {data.monthly_trend.map((entry, i) => (
                      <Cell key={i} fill={entry.savings >= 0 ? '#00C9A7' : '#E24B4A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: '#4A6080', textAlign: 'center', py: 4 }}>No data available</Typography>
            )}
          </Paper>
        </Grid>

        {/* AI Recommendations */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={600} mb={3}>AI Recommendations</Typography>
          <Grid container spacing={2}>
            {insights.map((item, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Paper
                  sx={{
                    p: 3,
                    background: insightBg[item.type] || '#111E33',
                    border: insightBorder[item.type] || '1px solid #1E2D45',
                    borderRadius: '16px',
                    height: '100%',
                  }}
                >
                  <Typography variant="h5" mb={1}>{item.icon}</Typography>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#F0F6FF', mb: 0.5 }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: '#4A6080', fontSize: 13, lineHeight: 1.5, mb: 1.5 }}>
                    {item.message}
                  </Typography>
                  {item.action && (
                    <Chip
                      label={item.action}
                      size="small"
                      sx={{
                        background: '#00C9A720',
                        color: '#00C9A7',
                        fontWeight: 600,
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
