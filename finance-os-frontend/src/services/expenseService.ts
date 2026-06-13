import { api } from './api';

export interface Expense {
  id: string;
  user_id: string;
  category_id?: string;
  amount: number;
  description?: string;
  payment_method?: string;
  expense_date: string;
  is_recurring: boolean;
  ai_category_suggestion?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  category_id?: string;
  payment_method?: string;
  from_date?: string;
  to_date?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const expenseService = {
  list: (filters?: ExpenseFilters) =>
    api.get<PaginatedResponse<Expense>>('/expenses', { params: filters }).then(r => r.data),

  get: (id: string) => api.get<Expense>(`/expenses/${id}`).then(r => r.data),

  create: (data: {
    amount: number; expense_date: string; category_id?: string;
    description?: string; payment_method?: string; is_recurring?: boolean;
  }) => api.post<Expense>('/expenses', data).then(r => r.data),

  update: (id: string, data: Partial<{
    amount: number; category_id?: string; description?: string;
    payment_method?: string; expense_date?: string; is_recurring?: boolean;
  }>) => api.put<Expense>(`/expenses/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/expenses/${id}`).then(r => r.data),

  getSummary: (month: number, year: number) =>
    api.get('/expenses/summary', { params: { month, year } }).then(r => r.data),

  bulkCreate: (expenses: Array<{
    amount: number; expense_date: string; category_id?: string;
    description?: string; payment_method?: string; is_recurring?: boolean;
  }>) => api.post<Expense[]>('/expenses/bulk', { expenses }).then(r => r.data),

  aiSuggest: (description: string) =>
    api.get<{ suggested_category?: string }>('/expenses/ai-suggest', { params: { description } }).then(r => r.data),
};
