import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
    canRetry,
    retry,
    isRecording,
    durationMillis,
    metering,
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

        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoPlaceholderText}>R</Text>
        </View>

        <BirthdayBanner uid={uid} />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.errorHint}>
              {canRetry
                ? "Nothing was lost — your recording and its details are saved."
                : "Nothing was recorded, so there's nothing to lose here."}
            </Text>
            <View style={styles.errorActions}>
              {canRetry && (
                <Pressable onPress={retry} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              )}
              <Pressable onPress={reset} style={styles.discardButton}>
                <Text style={styles.discardButtonText}>{canRetry ? 'Discard' : 'Dismiss'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

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

      <View style={styles.recordSection}>
        <RecordButton
          recording={isRecording}
          disabled={busy}
          metering={metering}
          onPress={() => (isRecording ? stopRecording() : startRecording())}
        />
        <View style={styles.stageRow}>
          {busy && <ActivityIndicator size="small" color={tokens.textSecondary} />}
          <Text style={styles.stageLabel}>{stageLabel(stage)}</Text>
        </View>
        {isRecording && <Text style={styles.timer}>{seconds}s / 60s</Text>}
      </View>
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    content: { flexGrow: 1, alignItems: 'center', padding: 24, gap: 20 },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary, marginTop: 12 },
    logoPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.pillPrimaryBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoPlaceholderText: { fontFamily: LORA.bold, fontSize: 22, color: t.pillPrimaryText },
    // Fixed footer (outside the ScrollView) so the record button stays in the thumb-reach
    // zone near the bottom of the screen regardless of scroll position (spec polish phase 2).
    recordSection: {
      alignItems: 'center',
      gap: 10,
      paddingTop: 14,
      paddingBottom: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.cardBorder,
      backgroundColor: t.bg,
    },
    stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stageLabel: { fontFamily: LORA.medium, fontSize: 14, color: t.textSecondary },
    timer: { fontFamily: LORA.regular, fontSize: 12, color: t.textTertiary },
    error: { fontFamily: LORA.medium, fontSize: 13, color: t.reminderText, textAlign: 'center' },
    errorCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: t.reminderCardBg,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    errorHint: { fontFamily: LORA.regular, fontSize: 12.5, color: t.reminderText, textAlign: 'center' },
    errorActions: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
    retryButton: { backgroundColor: t.pillPrimaryBg, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
    retryButtonText: { fontFamily: LORA.semiBold, fontSize: 13, color: t.pillPrimaryText },
    discardButton: { borderWidth: 1, borderColor: t.reminderText, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
    discardButtonText: { fontFamily: LORA.medium, fontSize: 13, color: t.reminderText },
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
