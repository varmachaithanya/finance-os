import { api } from './api';

export interface InsightCategory {
  name: string;
  color: string;
  amount: number;
  percentage: number;
  last_month: number;
  change_pct: number;
  trend: 'up' | 'down' | 'same';
}

export interface DailySpending {
  date: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  expenses: number;
  income: number;
  savings: number;
}

export interface InsightItem {
  type: 'positive' | 'warning' | 'danger' | 'info' | 'tip';
  icon: string;
  title: string;
  message: string;
  action: string | null;
}

export interface InsightsSummary {
  total_income: number;
  total_expenses: number;
  savings: number;
  savings_rate: number;
  categories: InsightCategory[];
  daily_spending: DailySpending[];
  monthly_trend: MonthlyTrend[];
  top_spending_day: string;
  insights: InsightItem[];
}

export const insightsService = {
  getSummary: () => api.get<InsightsSummary>('/insights/summary').then(r => r.data),
};
