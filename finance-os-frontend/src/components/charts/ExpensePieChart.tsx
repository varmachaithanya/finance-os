import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { CATEGORY_LOGOS } from '@/utils/logos';

interface PieData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

interface ExpensePieChartProps {
  data: PieData[];
}

const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value,
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#F1F5F9" fontSize={13} fontWeight={600}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#10B981" fontSize={16} fontWeight={700}>
        {'\u20B9'}{Number(value).toLocaleString('en-IN')}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="#94A3B8" fontSize={12}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <Box sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '10px',
        p: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <Typography fontSize={13} fontWeight={600} color="text.primary">
          {d.name}
        </Typography>
        <Typography fontSize={14} fontWeight={700} color="primary.main">
          {'\u20B9'}{Number(d.value).toLocaleString('en-IN')}
        </Typography>
        <Typography fontSize={11} color="text.secondary">
          {(d.payload.percentage || 0).toFixed(1)}% of total
        </Typography>
      </Box>
    );
  }
  return null;
};

const FALLBACK_COLORS = [
  '#10B981', '#14B8A6', '#EF4444', '#F59E0B',
  '#7F77DD', '#4ECDC4', '#FF6B6B', '#96CEB4',
  '#DDA0DD', '#AEB6BF',
];

const formatCurrency = (value: number): string =>
  '\u20B9' + value.toLocaleString('en-IN');

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data || data.length === 0) {
    return (
      <Box sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '16px',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 1,
      }}>
        <Typography fontSize={15} fontWeight={600} color="text.primary" mb={2} alignSelf="flex-start">
          {'\u{1F4CA}'} Expense Breakdown
        </Typography>
        <Typography fontSize={32}>{'\u{1F4CA}'}</Typography>
        <Typography fontSize={13} color="text.secondary">No data yet</Typography>
        <Typography fontSize={11} color="text.secondary">Add expenses to see insights</Typography>
      </Box>
    );
  }

  const chartData = data.map((item, i) => ({
    ...item,
    value: item.value,
    color: item.color || CATEGORY_LOGOS[item.name]?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  if (isMobile) {
    return (
      <Box sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '16px',
        p: 2,
      }}>
        <Typography fontSize={14} fontWeight={600} color="text.primary" mb={2}>
          {'\u{1F4CA}'} Expense Breakdown
        </Typography>
        <Box sx={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onClick={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ mt: 1 }}>
          {chartData.map((item, i) => (
            <Box
              key={i}
              onClick={() => setActiveIndex(i)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: '6px',
                px: 1,
                borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: activeIndex === i ? `${item.color}15` : 'transparent',
                border: activeIndex === i ? `1px solid ${item.color}30` : '1px solid transparent',
                mb: '3px',
                transition: 'all 0.15s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                <Typography fontSize={12} color="text.primary" fontWeight={activeIndex === i ? 600 : 400}>
                  {item.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontSize={11} color="text.secondary">
                  {(item.percentage || 0).toFixed(0)}%
                </Typography>
                <Typography fontSize={12} fontWeight={600} color={item.color}>
                  {formatCurrency(item.value)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      borderRadius: '16px',
      p: 3,
    }}>
      <Typography fontSize={15} fontWeight={600} color="text.primary" mb={2}>
        {'\u{1F4CA}'} Expense Breakdown
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 220, height: 220, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {chartData.map((item, i) => (
            <Box
              key={i}
              onMouseEnter={() => setActiveIndex(i)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: '5px',
                px: 1,
                borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: activeIndex === i ? `${item.color}15` : 'transparent',
                mb: '2px',
                transition: 'all 0.15s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                <Typography fontSize={12} color="text.primary" noWrap fontWeight={activeIndex === i ? 600 : 400}>
                  {item.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, ml: 1 }}>
                <Typography fontSize={11} color="text.secondary">
                  {(item.percentage || 0).toFixed(0)}%
                </Typography>
                <Typography fontSize={12} fontWeight={600} color={item.color}>
                  {formatCurrency(item.value)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ExpensePieChart;
