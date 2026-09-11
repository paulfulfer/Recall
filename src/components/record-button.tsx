import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

import { useAppTheme } from "@/providers/theme-provider";

const SIZE = 84;

interface RecordButtonProps {
  recording: boolean;
  disabled?: boolean;
  onPress: () => void;
}

// The one deliberately different element in the design system (spec section 7):
// large circular (not pill), primary pill color, with a pulse while recording.
export function RecordButton({ recording, disabled, onPress }: RecordButtonProps) {
  const { tokens } = useAppTheme();
  // Plain state (not a ref) so reading it during render — needed for .interpolate() below
  // — doesn't trip the react-hooks/refs lint rule; the Animated.Value identity is still
  // stable across renders via the lazy initializer.
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!recording) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.wrap} accessibilityRole="button">
      {recording && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              backgroundColor: tokens.pillPrimaryBg,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: tokens.pillPrimaryBg,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        <Animated.View
          style={recording ? [styles.stopIcon, { backgroundColor: tokens.pillPrimaryText }] : [styles.dot, { backgroundColor: tokens.pillPrimaryText }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: SIZE * 0.4,
    height: SIZE * 0.4,
    borderRadius: (SIZE * 0.4) / 2,
  },
  stopIcon: {
    width: SIZE * 0.32,
    height: SIZE * 0.32,
    borderRadius: 6,
  },
});
