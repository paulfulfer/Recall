import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkeletonBlock, SkeletonGroup } from '@/components/skeleton';
import type { ThemeTokens } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

// Shown on Home while the capture pipeline (upload/transcribe/extract) is in flight, in the
// same spot CaptureConfirm will mount once ready — same card shapes, just gray, so there's
// no layout jump when the real screen replaces it (spec polish phase 7).
export function CaptureConfirmSkeleton() {
  const { tokens } = useAppTheme();
  const styles = createStyles(tokens);

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} scrollEnabled={false}>
        <SkeletonGroup style={styles.group}>
          <View style={styles.headerRow}>
            <SkeletonBlock width={110} height={11} />
            <SkeletonBlock width={44} height={11} />
          </View>

          <View style={styles.card}>
            <SkeletonBlock width={70} height={10} />
            <SkeletonBlock width="95%" height={13} />
            <SkeletonBlock width="80%" height={13} />
          </View>

          <View style={styles.card}>
            <SkeletonBlock width={44} height={10} />
            <SkeletonBlock width="100%" height={38} radius={12} />
          </View>

          <View style={styles.card}>
            <SkeletonBlock width={64} height={10} />
            <View style={styles.chipRow}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonBlock key={i} width={64} height={26} radius={999} />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <SkeletonBlock width={40} height={10} />
            <SkeletonBlock width="90%" height={13} />
          </View>
        </SkeletonGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    group: { gap: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
