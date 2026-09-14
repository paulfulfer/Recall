import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaptureConfirm } from '@/components/capture-confirm';
import { LORA, type ThemeTokens } from '@/constants/theme';
import { getCapture } from '@/lib/captures';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';
import type { Capture } from '@/types/models';

// Spec section 5 screen 6 / section 9: merging an orphan reuses the same attach/create/
// orphan flow as the post-capture confirm screen (spec section 4 step 7) — the only
// difference is where it's reached from and that the capture already exists in Firestore.
export default function CaptureMergeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  if (!user || !id) return null;
  return <CaptureMerge uid={user.uid} captureId={id} />;
}

function CaptureMerge({ uid, captureId }: { uid: string; captureId: string }) {
  const { tokens } = useAppTheme();
  const [capture, setCapture] = useState<Capture | null | undefined>(undefined);

  useEffect(() => {
    getCapture(uid, captureId)
      .then(setCapture)
      .catch(() => setCapture(null));
  }, [uid, captureId]);

  if (capture === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
        <ActivityIndicator style={createStyles(tokens).loading} color={tokens.textTertiary} />
      </SafeAreaView>
    );
  }
  if (capture === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
        <Text style={createStyles(tokens).notFound}>This capture no longer exists.</Text>
      </SafeAreaView>
    );
  }

  return (
    <CaptureConfirm
      uid={uid}
      captureId={capture.id}
      transcript={capture.transcript}
      initialExtracted={capture.extracted}
      onDone={() => router.back()}
      onCancel={() => router.back()}
    />
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    notFound: { fontFamily: LORA.regular, fontSize: 14, color: t.textSecondary, textAlign: 'center', marginTop: 40 },
    loading: { marginTop: 40 },
  });
}
