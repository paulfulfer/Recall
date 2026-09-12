import { StyleSheet, Text, View } from 'react-native';

import { LAYOUT, LORA } from '@/constants/theme';
import { useCategoryAccent } from '@/hooks/use-category-accent';
import type { Category } from '@/constants/categories';

// Spec section 7: 8x8 rounded-square swatch in the accent color, plus the category name
// at 11.5px/500 in the same accent.
export function CategoryTag({ category }: { category: Category }) {
  const accent = useCategoryAccent(category);
  return (
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: accent }]} />
      <Text style={[styles.label, { color: accent }]}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: LAYOUT.categorySwatchSize, height: LAYOUT.categorySwatchSize, borderRadius: LAYOUT.categorySwatchRadius },
  label: { fontFamily: LORA.medium, fontSize: 11.5 },
});
