import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LAYOUT, LORA } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';

type Mode = 'sign-in' | 'sign-up';

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string } | undefined)?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'Something went wrong. Try again.';
  }
}

export default function SignInScreen() {
  const { tokens } = useAppTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up';

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: tokens.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: LORA.bold }]}>Recall</Text>
          <Text style={[styles.subtitle, { color: tokens.textTertiary, fontFamily: LORA.regular }]}>
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={tokens.textTertiary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[
              styles.input,
              { backgroundColor: tokens.inputBg, borderColor: tokens.cardBorder, color: tokens.textPrimary },
            ]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={tokens.textTertiary}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'password'}
            style={[
              styles.input,
              { backgroundColor: tokens.inputBg, borderColor: tokens.cardBorder, color: tokens.textPrimary },
            ]}
          />

          {error ? <Text style={[styles.error, { color: tokens.reminderText }]}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.primaryButton, { backgroundColor: tokens.pillPrimaryBg, opacity: submitting ? 0.6 : 1 }]}>
            {submitting ? (
              <ActivityIndicator color={tokens.pillPrimaryText} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: tokens.pillPrimaryText }]}>
                {isSignUp ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setError(null);
              setMode(isSignUp ? 'sign-in' : 'sign-up');
            }}
            style={styles.toggle}>
            <Text style={[styles.toggleText, { color: tokens.contactLink }]}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 26, letterSpacing: -0.3, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  input: { fontSize: 14, paddingVertical: 12, paddingHorizontal: 16, borderRadius: LAYOUT.pillRadius, borderWidth: 1 },
  error: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  primaryButton: { paddingVertical: 13, borderRadius: LAYOUT.pillRadius, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 14, fontFamily: LORA.semiBold },
  toggle: { alignItems: 'center', marginTop: 16 },
  toggleText: { fontSize: 13, fontFamily: LORA.medium },
});
