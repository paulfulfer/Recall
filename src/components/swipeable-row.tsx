import { useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { LORA } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

const ACTION_WIDTH = 72;

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

// Swipe-left-to-reveal-delete on a single row (spec polish phase 3). Deletion itself is the
// caller's responsibility — it's expected to stage a pending delete with an undo window
// rather than removing the data immediately, so the row disappearing here isn't final yet.
export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const { tokens } = useAppTheme();
  const ref = useRef<SwipeableMethods>(null);

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={32}
      renderRightActions={(progress) => (
        <DeleteAction
          progress={progress}
          backgroundColor={tokens.reminderCardBg}
          textColor={tokens.reminderText}
          onPress={() => {
            ref.current?.close();
            onDelete();
          }}
        />
      )}>
      {children}
    </Swipeable>
  );
}

function DeleteAction({
  progress,
  backgroundColor,
  textColor,
  onPress,
}: {
  progress: SharedValue<number>;
  backgroundColor: string;
  textColor: string;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - Math.min(progress.value, 1)) * ACTION_WIDTH }],
  }));

  return (
    <Animated.View style={[styles.action, { backgroundColor }, style]}>
      <Pressable onPress={onPress} style={styles.actionPressable} hitSlop={8}>
        <Text style={[styles.actionText, { color: textColor }]}>Delete</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: {
    width: ACTION_WIDTH,
    borderRadius: 12,
    marginLeft: 8,
    overflow: 'hidden',
  },
  actionPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontFamily: LORA.semiBold, fontSize: 13 },
});
