import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthdayBanner } from '@/components/birthday-banner';
import { CaptureConfirm } from '@/components/capture-confirm';
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
    case 'extracting':
      return 'Extracting details...';
    case 'error':
      return 'Something went wrong';
    default:
      return 'Tap to record';
  }
}

export default function HomeScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <RecordHome uid={user.uid} />;
}

function RecordHome({ uid }: { uid: string }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const {
    stage,
    captureId,
    transcript,
    extracted,
    error,
    isRecording,
    durationMillis,
    startRecording,
    stopRecording,
    submitTypedCapture,
    reset,
  } = useCaptureRecorder(uid);

  const [typedText, setTypedText] = useState('');

  if (stage === 'ready' && captureId && extracted) {
    return (
      <CaptureConfirm
        uid={uid}
        captureId={captureId}
        transcript={transcript}
        initialExtracted={extracted}
        onDone={() => {
          setTypedText('');
          reset();
        }}
        onCancel={reset}
      />
    );
  }

  const busy = stage === 'uploading' || stage === 'transcribing' || stage === 'extracting';
  const seconds = Math.floor(durationMillis / 1000);

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recall</Text>

        <BirthdayBanner uid={uid} />

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

        <View style={styles.typedCard}>
          <Text style={styles.typedLabel}>Or type it instead</Text>
          <TextInput
            value={typedText}
            onChangeText={setTypedText}
            placeholder="Met Sam at the coffee shop, works at..."
            placeholderTextColor={tokens.textTertiary}
            style={styles.typedInput}
            multiline
            editable={!busy}
          />
          <Pressable
            onPress={() => submitTypedCapture(typedText)}
            disabled={busy || !typedText.trim()}
            style={[styles.typedButton, (busy || !typedText.trim()) && styles.typedButtonDisabled]}>
            <Text style={styles.typedButtonText}>Log it</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    content: { flexGrow: 1, alignItems: 'center', padding: 24, gap: 20 },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary, marginTop: 12 },
    recordSection: { alignItems: 'center', gap: 12, marginTop: 24 },
    stageLabel: { fontFamily: LORA.medium, fontSize: 14, color: t.textSecondary },
    timer: { fontFamily: LORA.regular, fontSize: 12, color: t.textTertiary },
    error: { fontFamily: LORA.regular, fontSize: 13, color: t.reminderText, textAlign: 'center' },
    typedCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 16,
      gap: 10,
    },
    typedLabel: {
      fontFamily: LORA.semiBold,
      fontSize: 11,
      letterSpacing: 0.44,
      textTransform: 'uppercase',
      color: t.textTertiary,
    },
    typedInput: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      padding: 12,
      minHeight: 72,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
      textAlignVertical: 'top',
    },
    typedButton: {
      backgroundColor: t.pillPrimaryBg,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
    },
    typedButtonDisabled: { opacity: 0.5 },
    typedButtonText: { fontFamily: LORA.semiBold, fontSize: 14, color: t.pillPrimaryText },
  });
}
