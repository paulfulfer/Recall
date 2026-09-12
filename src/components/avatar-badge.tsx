import { StyleSheet, Text, View } from 'react-native';

import { LORA } from '@/constants/theme';
import { useCategoryAccent } from '@/hooks/use-category-accent';
import type { Category } from '@/constants/categories';

interface AvatarBadgeProps {
  name: string;
  category: Category;
  size: number;
  radius: number;
  fontSize?: number;
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Spec section 7: rounded-square initials badge, background = accent at ~12% opacity,
// text = full accent color.
export function AvatarBadge({ name, category, size, radius, fontSize }: AvatarBadgeProps) {
  const accent = useCategoryAccent(category);
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radius, backgroundColor: `${accent}1F` },
      ]}>
      <Text style={[styles.text, { color: accent, fontSize: fontSize ?? size * 0.4 }]}>
        {initialsFor(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: LORA.semiBold },
});
