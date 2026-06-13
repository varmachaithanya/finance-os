import { useQuery } from '@tanstack/react-query';
import { categoryService, type Category } from '@/services/categoryService';

export function useCategories(type?: string) {
  const { data, ...rest } = useQuery({
    queryKey: ['categories', type],
    queryFn: () => categoryService.list(type),
  });
  const categories: Category[] = (data as any)?.data ?? [];
  return { categories, ...rest };
}
