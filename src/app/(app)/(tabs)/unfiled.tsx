import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableRow } from '@/components/swipeable-row';
import { UndoSnackbar } from '@/components/undo-snackbar';
import { LAYOUT, LORA, type ThemeTokens } from '@/constants/theme';
import { usePendingDelete } from '@/hooks/use-pending-delete';
import { deleteCapture, subscribeToOrphanCaptures } from '@/lib/captures';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';
import type { Capture } from '@/types/models';

function formatAnchors(capture: Capture): string[] {
  const lines: string[] = [new Date(capture.anchors.timestamp).toLocaleString()];
  if (capture.anchors.location) {
    const { lat, lng, label } = capture.anchors.location;
    lines.push(`Location: ${label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}`);
  }
  if (capture.anchors.calendarEvent) {
    lines.push(`Calendar: ${capture.anchors.calendarEvent}`);
  }
  return lines;
}

// Spec section 5 screen 6 / section 9: captures with no attached person, anchors shown
// prominently so the raw context of the moment isn't lost even without a name.
export default function UnfiledScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <UnfiledList uid={user.uid} />;
}

function UnfiledList({ uid }: { uid: string }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const { pending, requestDelete, undo } = usePendingDelete<Capture>((capture) => deleteCapture(uid, capture.id));

  useEffect(
    () =>
      subscribeToOrphanCaptures(uid, (next) => {
        setCaptures(next);
        setLoading(false);
      }),
    [uid],
  );

  const visibleCaptures = pending ? captures.filter((c) => c.id !== pending.item.id) : captures;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Unfiled{visibleCaptures.length > 0 ? ` (${visibleCaptures.length})` : ''}</Text>
      </View>

      <FlatList
        data={visibleCaptures}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loading} color={tokens.textTertiary} />
          ) : (
            <Text style={styles.empty}>Nothing unfiled — every capture has a person.</Text>
          )
        }
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => requestDelete(item, 'Capture deleted')}>
            <Pressable style={styles.card} onPress={() => router.push(`/capture/${item.id}`)}>
              {formatAnchors(item).map((line, i) => (
                <Text key={i} style={i === 0 ? styles.date : styles.anchor}>{line}</Text>
              ))}
              {item.extracted.name ? <Text style={styles.name}>{item.extracted.name}</Text> : null}
              {item.extracted.facts.length > 0 ? (
                <Text style={styles.snippet} numberOfLines={2}>{item.extracted.facts.join(' • ')}</Text>
              ) : item.transcript ? (
                <Text style={styles.snippet} numberOfLines={2}>{item.transcript}</Text>
              ) : (
                <Text style={styles.snippet}>No details captured.</Text>
              )}
            </Pressable>
          </SwipeableRow>
        )}
      />

      {pending && <UndoSnackbar message={pending.message} onUndo={undo} />}
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary },
    listContent: { padding: 16, gap: LAYOUT.listRowGap },
    empty: { fontFamily: LORA.regular, fontSize: 14, color: t.textTertiary, textAlign: 'center', marginTop: 40 },
    loading: { marginTop: 40 },
    card: {
      backgroundColor: t.card,
      borderRadius: LAYOUT.cardRadius,
      padding: 16,
      gap: 4,
      marginBottom: LAYOUT.listRowGap,
    },
    date: { fontFamily: LORA.semiBold, fontSize: 13, color: t.textPrimary },
    anchor: { fontFamily: LORA.regular, fontSize: 12.5, color: t.textSecondary },
    name: { fontFamily: LORA.medium, fontSize: 14, color: t.contactLink, marginTop: 4 },
    snippet: { fontFamily: LORA.regular, fontSize: 13.5, lineHeight: 19, color: t.textSecondary, marginTop: 4 },
  });
}
