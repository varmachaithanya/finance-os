import { api } from './api';

export interface GmailTransaction {
  id: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  date: string;
  bank: string;
  suggested_category: string;
  raw_subject: string;
  raw_snippet: string;
  selected: boolean;
}

export interface FetchTransactionsResponse {
  transactions: GmailTransaction[];
  total: number;
  emails_scanned: number;
  parsed_ok: number;
  skipped_no_amount: number;
  skipped_invalid: number;
  skipped_error: number;
  days_searched: number;
  is_incremental: boolean;
  fetched_at: string;
  last_fetch_was: string | null;
  debug_query?: string;
}

export interface ImportTransactionsResponse {
  imported_count: number;
  duplicate_count: number;
  failed_count: number;
  message: string;
}

export const gmailService = {
  getAuthUrl: async () => {
    const res = await api.get<{ auth_url: string }>('/gmail/auth-url');
    return res.data;
  },

  getStatus: async () => {
    const res = await api.get<{ connected: boolean; connected_at?: string }>('/gmail/status');
    return res.data;
  },

  fetchTransactions: async (params: { days?: number; incremental?: boolean }) => {
    const res = await api.post<FetchTransactionsResponse>('/gmail/fetch-transactions', null, { params });
    return res.data;
  },

  importTransactions: async (transactions: Array<{
    amount: number;
    description: string;
    expense_date: string;
    suggested_category: string;
    payment_method: string;
  }>) => {
    const res = await api.post<ImportTransactionsResponse>('/gmail/import-transactions', { transactions });
    return res.data;
  },

  disconnect: async () => {
    const res = await api.delete('/gmail/disconnect');
    return res.data;
  },

  resetFetchTime: async () => {
    const res = await api.post('/gmail/reset-fetch-time');
    return res.data;
  },
};
