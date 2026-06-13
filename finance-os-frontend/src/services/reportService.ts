import { api } from './api';

export interface ReportData {
  summary: {
    period: string;
    start_date: string;
    end_date: string;
    total_income: number;
    total_expenses: number;
    net_savings: number;
  };
  expenses: Array<{ date: string; description?: string; amount: number; payment_method?: string }>;
  income: Array<{ date: string; source: string; amount: number; description?: string }>;
  generated_at: string;
}

export const reportService = {
  generate: (params: { period?: string; year?: number; month?: number; week?: number }) =>
    api.get<ReportData>('/reports/generate', { params }).then(r => r.data),

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
