import { api } from './api';

export interface GmailTransaction {
  id: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  date: string;
  bank: string;
  suggested_category: string | null;
  suggested_category_id: string | null;
  raw_subject: string;
  raw_snippet: string;
  selected: boolean;
}

export const gmailService = {
  getAuthUrl: () => api.get<{ auth_url: string }>('/gmail/auth-url').then(r => r.data),
  getStatus: () => api.get<{ connected: boolean; email: string | null }>('/gmail/status').then(r => r.data),
  fetchTransactions: (days: number = 30) =>
    api.post<{ transactions: GmailTransaction[]; total: number }>('/gmail/fetch-transactions', null, { params: { days } }).then(r => r.data),
  importTransactions: (transactions: Array<{ amount: number; category_id: string; description: string; expense_date: string; payment_method: string }>) =>
    api.post<{ imported_count: number; failed_count: number }>('/gmail/import-transactions', { transactions }).then(r => r.data),
  disconnect: () => api.delete('/gmail/disconnect').then(r => r.data),
};
