import { api } from './api';

export interface CategoryPrediction {
  category_id?: string;
  category_name: string;
  current_average: number;
  predicted_amount: number;
  confidence_score: number;
  growth_rate?: number;
}

export interface PredictionResponse {
  predictions: CategoryPrediction[];
  next_month: number;
  next_year: number;
  generated_at: string;
}

export interface SavingSuggestion {
  type: string;
  title: string;
  description: string;
  priority: string;
  monthly_savings: number;
  yearly_savings: number;
  category?: string;
}

export interface SavingsResponse {
  suggestions: SavingSuggestion[];
  total_monthly_savings: number;
  total_yearly_savings: number;
}

export interface AnomalyItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  amount?: number;
  category_name?: string;
  merchant?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface AnomalyListResponse {
  anomalies: AnomalyItem[];
  total: number;
  unread_count: number;
}

export interface EMIRequest {
  loan_amount: number;
  interest_rate: number;
  tenure_months: number;
}

export interface EMIScheduleRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface EMIResponse {
  monthly_emi: number;
  total_interest: number;
  total_payment: number;
  loan_amount: number;
  interest_rate: number;
  tenure_months: number;
  amortization_schedule: EMIScheduleRow[];
  principal_percentage: number;
  interest_percentage: number;
}

export interface DebtPayoffPlan {
  strategy: string;
  months_to_debt_free: number;
  total_interest_paid: number;
  total_principal: number;
  total_saved: number;
  schedule: Array<{ month: number; payment: number; principal: number; interest: number; balance: number }>;
}

export interface DebtPayoffResponse {
  snowball: DebtPayoffPlan;
  avalanche: DebtPayoffPlan;
  best_strategy: string;
  interest_saved: number;
}

export const aiService = {
  getPredictions: () =>
    api.get<PredictionResponse>('/ai/predictions').then(r => r.data),

  getSavingsSuggestions: () =>
    api.get<SavingsResponse>('/ai/savings-suggestions').then(r => r.data),

  getAnomalies: () =>
    api.get<AnomalyListResponse>('/ai/anomalies').then(r => r.data),

  listAnomalies: () =>
    api.get<AnomalyListResponse>('/ai/anomalies/list').then(r => r.data),

  resolveAnomaly: (id: string) =>
    api.post(`/ai/anomalies/${id}/resolve`).then(r => r.data),

  getAnomalyCount: () =>
    api.get<{ unread_count: number }>('/ai/anomalies/count').then(r => r.data),

  calculateEMI: (data: EMIRequest) =>
    api.post<EMIResponse>('/ai/emi-calculate', data).then(r => r.data),

  getDebtPayoffPlan: (monthly_budget?: number) =>
    api.get<DebtPayoffResponse>('/ai/debt-payoff-plan', { params: { monthly_budget: monthly_budget || 0 } }).then(r => r.data),
};
