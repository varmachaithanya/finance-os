import { api } from './api';

export interface DashboardSummary {
  total_income_month: number;
  total_expenses_month: number;
  total_debt: number;
  remaining_balance: number;
  monthly_savings: number;
  credit_card_utilization_avg: number;
  upcoming_dues: Array<{ type: string; name: string; amount: number; due_date: string }>;
  upcoming_renewals: Array<{ service_name: string; amount: number; renewal_date: string }>;
  budget_alerts: Array<{ category: string; pct_used: number }>;
}

export interface ChartData {
  expense_by_category: Array<{ category: string; amount: number; count: number }>;
  monthly_trend: Array<{ month: string; expenses: number; income: number }>;
  income_vs_expense: Array<{ month: string; income: number; expenses: number }>;
  debt_reduction: Array<{ month: string; total_debt: number }>;
}

export const dashboardService = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
  getCharts: (months: number = 6) => api.get<ChartData>('/dashboard/charts', { params: { months } }).then(r => r.data),
};
