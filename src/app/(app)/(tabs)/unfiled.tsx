import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LAYOUT, LORA, type ThemeTokens } from '@/constants/theme';
import { subscribeToOrphanCaptures } from '@/lib/captures';
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

  useEffect(() => subscribeToOrphanCaptures(uid, setCaptures), [uid]);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Unfiled{captures.length > 0 ? ` (${captures.length})` : ''}</Text>
      </View>

      <FlatList
        data={captures}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Nothing unfiled — every capture has a person.</Text>}
        renderItem={({ item }) => (
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
        )}
      />
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
