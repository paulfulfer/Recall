import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordButton } from '@/components/record-button';
import { LORA, type ThemeTokens } from '@/constants/theme';
import { useCaptureRecorder } from '@/hooks/use-capture-recorder';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';

function stageLabel(stage: string) {
  switch (stage) {
    case 'recording':
      return 'Listening...';
    case 'uploading':
      return 'Uploading...';
    case 'transcribing':
      return 'Transcribing...';
    case 'done':
      return 'Done';
    case 'error':
      return 'Something went wrong';
    default:
      return 'Tap to record';
  }
}

export default function HomeScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <RecordHome uid={user.uid} email={user.email} />;
}

function RecordHome({ uid, email }: { uid: string; email: string | null }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { signOut } = useAuth();
  const { stage, transcript, error, isRecording, durationMillis, startRecording, stopRecording } =
    useCaptureRecorder(uid);

  const busy = stage === 'uploading' || stage === 'transcribing';
  const seconds = Math.floor(durationMillis / 1000);

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recall</Text>

        <View style={styles.recordSection}>
          <RecordButton
            recording={isRecording}
            disabled={busy}
            onPress={() => (isRecording ? stopRecording() : startRecording())}
          />
          <Text style={styles.stageLabel}>{stageLabel(stage)}</Text>
          {isRecording && <Text style={styles.timer}>{seconds}s / 60s</Text>}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {transcript !== null ? (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>Transcript</Text>
            <Text style={styles.transcriptText}>{transcript || '(no speech detected)'}</Text>
          </View>
        ) : null}

        {/* TEMP: real sign-out lands in the Settings screen (build phase 14) */}
        <Text style={styles.email}>{email}</Text>
        <Pressable onPress={() => signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    content: { flexGrow: 1, alignItems: 'center', padding: 24, gap: 20 },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary, marginTop: 12 },
    recordSection: { alignItems: 'center', gap: 12, marginTop: 40 },
    stageLabel: { fontFamily: LORA.medium, fontSize: 14, color: t.textSecondary },
    timer: { fontFamily: LORA.regular, fontSize: 12, color: t.textTertiary },
    error: { fontFamily: LORA.regular, fontSize: 13, color: t.reminderText, textAlign: 'center' },
    transcriptCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 16,
      gap: 8,
    },
    transcriptLabel: {
      fontFamily: LORA.semiBold,
      fontSize: 11,
      letterSpacing: 0.44,
      textTransform: 'uppercase',
      color: t.textTertiary,
    },
    transcriptText: { fontFamily: LORA.regular, fontSize: 14, lineHeight: 21.7, color: t.textPrimary },
    email: { fontFamily: LORA.regular, fontSize: 12, color: t.textTertiary, marginTop: 24 },
    signOut: { fontFamily: LORA.medium, fontSize: 13, color: t.contactLink },
  });
}
