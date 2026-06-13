import { api } from './api';

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  created_at: string;
}

export const categoryService = {
  list: (type?: string) =>
    api.get<{ data: Category[]; total: number }>('/categories', { params: type ? { type } : {} }).then(r => r.data),

  create: (data: { name: string; type: string; icon?: string; color?: string }) =>
    api.post<Category>('/categories', data).then(r => r.data),

  update: (id: string, data: { name?: string; icon?: string; color?: string }) =>
    api.put<Category>(`/categories/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/categories/${id}`).then(r => r.data),
};
