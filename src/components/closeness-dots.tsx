import { Pressable, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/theme';
import { useCategoryAccent } from '@/hooks/use-category-accent';
import { useAppTheme } from '@/providers/theme-provider';
import type { Category } from '@/constants/categories';

interface ClosenessDotsProps {
  category: Category;
  value: 1 | 2 | 3 | 4 | 5;
  onChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
}

// Spec section 7: five 6px circles, 5px gap. Filled = category accent, empty = transparent
// with a 1px border. Interactive (tap a dot to set closeness) only when onChange is passed.
export function ClosenessDots({ category, value, onChange }: ClosenessDotsProps) {
  const accent = useCategoryAccent(category);
  const { tokens } = useAppTheme();

  return (
    <View style={styles.row}>
      {([1, 2, 3, 4, 5] as const).map((dot) => {
        const filled = dot <= value;
        const Dot = (
          <View
            style={[
              styles.dot,
              filled
                ? { backgroundColor: accent }
                : { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens.dotEmptyBorder },
            ]}
          />
        );
        if (!onChange) return <View key={dot}>{Dot}</View>;
        return (
          <Pressable key={dot} hitSlop={8} onPress={() => onChange(dot)}>
            {Dot}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: LAYOUT.closenessDotGap },
  dot: { width: LAYOUT.closenessDotSize, height: LAYOUT.closenessDotSize, borderRadius: LAYOUT.closenessDotSize / 2 },
});
