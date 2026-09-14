import { useEffect, useRef } from 'react';
import { Animated, Easing, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/providers/theme-provider';

interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// A single gray placeholder block. Wrap one or more in <SkeletonGroup> so they all pulse
// in sync off one shared animation loop instead of each driving its own (spec polish phase 7).
export function SkeletonBlock({ width = '100%', height = 14, radius = 6, style }: SkeletonBlockProps) {
  const { tokens } = useAppTheme();
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: tokens.inputBg }, style]} />;
}

export function SkeletonGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}
