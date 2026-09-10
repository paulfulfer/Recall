// Closed set — also given to the Gemini extraction prompt so it picks from this list
// rather than inventing categories. Keep free of styling concerns (see constants/theme.ts
// for category accent colors).

export type Category = 'Work' | 'School' | 'Family' | 'Friends' | 'Acquaintances';

export const CATEGORIES: Category[] = ['Work', 'School', 'Family', 'Friends', 'Acquaintances'];

export interface CategoryField {
  key: string;
  label: string;
}

export const CATEGORY_FIELDS: Record<Category, CategoryField[]> = {
  Work: [
    { key: 'company', label: 'Company' },
    { key: 'title', label: 'Title' },
  ],
  School: [
    { key: 'school', label: 'School' },
    { key: 'year', label: 'Class / year' },
  ],
  Family: [{ key: 'relation', label: 'Relation' }],
  Friends: [{ key: 'howMet', label: 'How you met' }],
  Acquaintances: [{ key: 'context', label: 'Context' }],
};
