import { api } from './api';
import type { PaginatedResponse } from './expenseService';

export interface Debt {
  id: string;
  user_id: string;
  lender_name: string;
  debt_type: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  emi_amount?: number;
  interest_rate?: number;
  due_date?: string;
  start_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const debtService = {
  list: (params?: {
    page?: number; limit?: number; debt_type?: string; status?: string;
  }) => api.get<PaginatedResponse<Debt>>('/debts', { params }).then(r => r.data),

  get: (id: string) => api.get<Debt>(`/debts/${id}`).then(r => r.data),

  create: (data: {
    lender_name: string; debt_type: string; total_amount: number;
    paid_amount?: number; emi_amount?: number; interest_rate?: number;
    due_date?: string; start_date?: string; notes?: string;
  }) => api.post<Debt>('/debts', data).then(r => r.data),

  update: (id: string, data: Partial<{
    lender_name: string; debt_type: string; total_amount: number;
    emi_amount?: number; interest_rate?: number;
    due_date?: string; start_date?: string; status?: string; notes?: string;
  }>) => api.put<Debt>(`/debts/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/debts/${id}`).then(r => r.data),

  recordPayment: (id: string, amount: number) =>
    api.patch<Debt>(`/debts/${id}/payment`, { amount }).then(r => r.data),

  getSummary: () => api.get('/debts/summary').then(r => r.data),

  getPayoffPlan: (strategy: 'snowball' | 'avalanche' = 'snowball') =>
    api.get('/debts/payoff-plan', { params: { strategy } }).then(r => r.data),
};
