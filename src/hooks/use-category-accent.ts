import type { Category } from '@/constants/categories';
import { CATEGORY_ACCENTS } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

export function useCategoryAccent(category: Category) {
  const { mode } = useAppTheme();
  return CATEGORY_ACCENTS[category][mode];
}
