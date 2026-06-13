import { api } from './api';
import type { PaginatedResponse } from './expenseService';

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  description?: string;
  income_date: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export const incomeService = {
  list: (params?: {
    page?: number; limit?: number; sort?: string; order?: 'asc' | 'desc';
    search?: string; source?: string; from_date?: string; to_date?: string;
  }) => api.get<PaginatedResponse<Income>>('/income', { params }).then(r => r.data),

  get: (id: string) => api.get<Income>(`/income/${id}`).then(r => r.data),

  create: (data: {
    source: string; amount: number; income_date: string;
    description?: string; is_recurring?: boolean;
  }) => api.post<Income>('/income', data).then(r => r.data),

  update: (id: string, data: Partial<{
    source: string; amount: number; description?: string;
    income_date?: string; is_recurring?: boolean;
  }>) => api.put<Income>(`/income/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/income/${id}`).then(r => r.data),

  getSummary: (month: number, year: number) =>
    api.get('/income/summary', { params: { month, year } }).then(r => r.data),
};
