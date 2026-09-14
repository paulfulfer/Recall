import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/providers/theme-provider";

const SIZE = 84;
const BAR_COUNT = 5;
// Per-bar weighting so the row reads as an organic waveform (taller in the
// middle) rather than identical bars all moving in lockstep.
const BAR_WEIGHTS = [0.55, 0.8, 1, 0.8, 0.55];
const BAR_MIN = 4;
const BAR_MAX = 22;
// Typical dB range expo-audio reports metering in; -50dB..0dB covers silence
// to a normal speaking voice, so it maps onto a 0..1 level more usefully than
// the full -160..0 device range would.
const METERING_FLOOR_DB = -50;

function levelFromMetering(metering: number | undefined) {
  if (metering === undefined || Number.isNaN(metering)) return 0;
  const normalized = (metering - METERING_FLOOR_DB) / -METERING_FLOOR_DB;
  return Math.max(0, Math.min(1, normalized));
}

interface RecordButtonProps {
  recording: boolean;
  disabled?: boolean;
  onPress: () => void;
  metering?: number;
}

// The one deliberately different element in the design system (spec section 7):
// large circular (not pill), primary pill color, with a pulse/waveform while recording.
export function RecordButton({ recording, disabled, onPress, metering }: RecordButtonProps) {
  const { tokens } = useAppTheme();
  // Plain state (not a ref) so reading it during render — needed for .interpolate() below
  // — doesn't trip the react-hooks/refs lint rule; the Animated.Value identity is still
  // stable across renders via the lazy initializer.
  const [pulse] = useState(() => new Animated.Value(0));
  const barsRef = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN)));
  const bars = barsRef.current;

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

  useEffect(() => {
    if (!recording) {
      bars.forEach((bar) => bar.setValue(BAR_MIN));
      return;
    }
    const level = levelFromMetering(metering);
    Animated.parallel(
      bars.map((bar, i) =>
        Animated.timing(bar, {
          toValue: BAR_MIN + level * (BAR_MAX - BAR_MIN) * BAR_WEIGHTS[i],
          duration: 100,
          easing: Easing.out(Easing.ease),
          // Height can't use the native driver.
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [recording, metering, bars]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.container}>
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
      <View style={styles.barsRow} pointerEvents="none">
        {recording &&
          bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[styles.bar, { height: bar, backgroundColor: tokens.pillPrimaryBg }]}
            />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
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
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: BAR_MAX,
    marginTop: 10,
    gap: 5,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
