import type { Category } from '@weekplan/shared';

/** Add a category here (and in the Category type + CategorySchema) and it shows up everywhere. */
export const CATEGORIES: Record<Category, { label: string; color: string }> = {
  work: { label: 'کاری', color: 'var(--c-work)' },
  team: { label: 'جلسات', color: 'var(--c-team)' },
  learning: { label: 'یادگیری', color: 'var(--c-learning)' },
  personal: { label: 'شخصی', color: 'var(--c-personal)' },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
