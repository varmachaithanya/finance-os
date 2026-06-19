import { api } from './api';

interface ReportData {
  summary: {
    period: string;
    start_date: string;
    end_date: string;
    total_income: number;
    total_expenses: number;
    net_savings: number;
  };
  expenses: Array<{ date: string; description?: string; amount: number; payment_method?: string; category?: string }>;
  income: Array<{ date: string; source: string; amount: number; description?: string }>;
  generated_at: string;
}

export interface ReportPreviewData {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  expenses: Array<{ date: string; description?: string; amount: number; payment_method?: string; category?: string }>;
  income: Array<{ date: string; source: string; amount: number; description?: string }>;
}

export const reportService = {
  generate: (params: { period?: string; year?: number; month?: number; week?: number }) =>
    api.get<ReportData>('/reports/generate', { params }).then(r => {
      const d = r.data;
      return {
        period: d.summary.period,
        totalIncome: Number(d.summary.total_income || 0),
        totalExpenses: Number(d.summary.total_expenses || 0),
        netSavings: Number(d.summary.net_savings || 0),
        expenses: d.expenses,
        income: d.income,
      } satisfies ReportPreviewData;
    }),

  exportReport: async (format: 'pdf' | 'csv' | 'xlsx', params: {
    period?: string; year?: number; month?: number; week?: number;
  }) => {
    const res = await api.get('/reports/export', {
      params: { ...params, format },
      responseType: 'blob',
    });
    const disposition = res.headers['content-disposition'];
    const match = disposition?.match(/filename=(.+)/);
    const filename = match ? match[1] : `report.${format}`;
    const { default: { saveAs } } = await import('file-saver');
    saveAs(new Blob([res.data]), filename);
  },
};
