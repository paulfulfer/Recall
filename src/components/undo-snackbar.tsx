import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LORA, type ThemeTokens } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

interface UndoSnackbarProps {
  message: string;
  onUndo: () => void;
}

// Shared bottom snackbar for the app-wide swipe-to-delete + undo pattern (spec polish
// phase 3): render this whenever the screen's usePendingDelete has a pending item.
export function UndoSnackbar({ message, onUndo }: UndoSnackbarProps) {
  const { tokens } = useAppTheme();
  const styles = createStyles(tokens);

  return (
    <View style={styles.bar}>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onUndo} hitSlop={8}>
        <Text style={styles.undo}>Undo</Text>
      </Pressable>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.cardBorder,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    message: { fontFamily: LORA.regular, fontSize: 13.5, color: t.textPrimary },
    undo: { fontFamily: LORA.semiBold, fontSize: 13.5, color: t.contactLink },
  });
}
