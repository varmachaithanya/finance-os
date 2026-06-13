import { api } from './api';
import type { PaginatedResponse } from './expenseService';

export interface UpcomingRenewalItem {
  id: string;
  service_name: string;
  amount: number;
  renewal_date: string;
  days_remaining: number;
}

export interface MonthlyCostByCategory {
  category: string;
  monthly_cost: number;
}

export interface MonthlyCostResponse {
  total_monthly_cost: number;
  by_category: MonthlyCostByCategory[];
}

export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  category?: string;
  amount: number;
  billing_cycle: string;
  renewal_date: string;
  auto_renewal: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const subscriptionService = {
  list: (params?: {
    page?: number; limit?: number; is_active?: boolean; billing_cycle?: string;
  }) => api.get<PaginatedResponse<Subscription>>('/subscriptions', { params }).then(r => r.data),

  get: (id: string) => api.get<Subscription>(`/subscriptions/${id}`).then(r => r.data),

  create: (data: {
    service_name: string; amount: number; renewal_date: string;
    category?: string; billing_cycle?: string; auto_renewal?: boolean; notes?: string;
  }) => api.post<Subscription>('/subscriptions', data).then(r => r.data),

  update: (id: string, data: Partial<{
    service_name: string; category?: string; amount: number;
    billing_cycle?: string; renewal_date?: string;
    auto_renewal?: boolean; is_active?: boolean; notes?: string;
  }>) => api.put<Subscription>(`/subscriptions/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/subscriptions/${id}`).then(r => r.data),

  toggleActive: (id: string) =>
    api.patch<Subscription>(`/subscriptions/${id}/toggle`).then(r => r.data),

  getUpcoming: (days: number = 30) =>
    api.get<{ data: Array<{ id: string; service_name: string; amount: number; renewal_date: string; days_remaining: number }> }>(
      '/subscriptions/upcoming', { params: { days } }
    ).then(r => r.data),

  getMonthlyCost: () =>
    api.get<MonthlyCostResponse>('/subscriptions/monthly-cost').then(r => r.data),
};
