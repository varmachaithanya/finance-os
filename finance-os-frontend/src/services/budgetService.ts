import { api } from './api';
import type { PaginatedResponse } from './expenseService';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  budget_amount: number;
  period: string;
  month?: number;
  year?: number;
  created_at: string;
  updated_at: string;
}

export const budgetService = {
  list: (month: number, year: number, params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Budget>>('/budgets', { params: { ...params, month, year } }).then(r => r.data),

  create: (data: {
    category_id: string; budget_amount: number;
    period?: string; month?: number; year?: number;
  }) => api.post<Budget>('/budgets', data).then(r => r.data),

  update: (id: string, data: Partial<{
    budget_amount: number; period?: string; month?: number; year?: number;
  }>) => api.put<Budget>(`/budgets/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/budgets/${id}`).then(r => r.data),

  getVsActual: (month: number, year: number) =>
    api.get('/budgets/vs-actual', { params: { month, year } }).then(r => r.data),

  getAlerts: (month: number, year: number) =>
    api.get('/budgets/alerts', { params: { month, year } }).then(r => r.data),
};
