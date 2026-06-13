import { api } from './api';

export interface CreditCard {
  id: string;
  user_id: string;
  bank_name: string;
  card_name: string;
  last_four_digits?: string;
  credit_limit: number;
  outstanding_balance: number;
  minimum_due: number;
  due_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Utilization {
  card_id: string;
  card_name: string;
  bank_name: string;
  utilization_pct: number;
  status: string;
}

export interface DueAlert {
  card_id: string;
  card_name: string;
  bank_name: string;
  due_date: string;
  minimum_due: number;
  days_remaining: number;
}

export const creditCardService = {
  list: () => api.get<{ data: CreditCard[]; total: number }>('/credit-cards').then(r => r.data),

  get: (id: string) => api.get<CreditCard>(`/credit-cards/${id}`).then(r => r.data),

  create: (data: {
    bank_name: string; card_name: string; credit_limit: number;
    last_four_digits?: string; outstanding_balance?: number;
    minimum_due?: number; due_date?: string;
  }) => api.post<CreditCard>('/credit-cards', data).then(r => r.data),

  update: (id: string, data: Partial<{
    bank_name: string; card_name: string; last_four_digits?: string;
    credit_limit: number; outstanding_balance: number;
    minimum_due: number; due_date?: string; is_active?: boolean;
  }>) => api.put<CreditCard>(`/credit-cards/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/credit-cards/${id}`).then(r => r.data),

  getUtilization: () => api.get<{ data: Utilization[] }>('/credit-cards/utilization').then(r => r.data),

  getDueAlerts: () => api.get<{ data: DueAlert[] }>('/credit-cards/due-alerts').then(r => r.data),
};
